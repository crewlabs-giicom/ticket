import { requireInfraUser } from '../../../utils/infra'
import { getDb } from '../../../database/index'
import {
  RANGES, parseRange, summarizeRates, counterDelta, computeAvailability, buildHeatmap, interfaceInsights,
  type RateBucket, type WanEventRow,
} from '../../../utils/mikrotik/analytics'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const q = getQuery(event)
  const range = parseRange(q.range)
  const { ms, bucketSec } = RANGES[range]
  const requested = typeof q.name === 'string' ? q.name : ''
  const db = getDb()

  const [bucketRows] = await db.execute(
    `SELECT interface_name AS name, FLOOR(UNIX_TIMESTAMP(ts) / ?) * ? AS t,
            AVG(rx_bps) AS rxAvg, AVG(tx_bps) AS txAvg, MAX(rx_bps) AS rxMax, MAX(tx_bps) AS txMax
     FROM net_iface_samples WHERE ts >= NOW() - INTERVAL ? SECOND
     GROUP BY interface_name, t ORDER BY t`,
    [bucketSec, bucketSec, Math.round(ms / 1000)]
  ) as any[]

  const [healthRows] = await db.execute(
    `SELECT interface_name AS name,
            MIN(rx_errors) AS rxeMin, MAX(rx_errors) AS rxeMax, MIN(tx_errors) AS txeMin, MAX(tx_errors) AS txeMax,
            MIN(rx_drops) AS rxdMin, MAX(rx_drops) AS rxdMax, MIN(tx_drops) AS txdMin, MAX(tx_drops) AS txdMax,
            MIN(link_downs) AS ldMin, MAX(link_downs) AS ldMax, COUNT(*) AS samples
     FROM net_iface_samples WHERE ts >= NOW() - INTERVAL ? SECOND GROUP BY interface_name`,
    [Math.round(ms / 1000)]
  ) as any[]

  const byName = new Map<string, RateBucket[]>()
  for (const r of bucketRows as any[]) {
    const list = byName.get(r.name) || []
    list.push({ ts: Number(r.t) * 1000, rxAvg: Number(r.rxAvg), txAvg: Number(r.txAvg), rxMax: Number(r.rxMax), txMax: Number(r.txMax) })
    byName.set(r.name, list)
  }

  const n = (v: any) => (v === null || v === undefined ? null : Number(v))
  const health = new Map<string, { errors: number; drops: number; linkDowns: number }>()
  for (const h of healthRows as any[]) {
    health.set(h.name, {
      errors: counterDelta(n(h.rxeMin), n(h.rxeMax)) + counterDelta(n(h.txeMin), n(h.txeMax)),
      drops: counterDelta(n(h.rxdMin), n(h.rxdMax)) + counterDelta(n(h.txdMin), n(h.txdMax)),
      linkDowns: counterDelta(n(h.ldMin), n(h.ldMax)),
    })
  }

  const items = [...byName].map(([name, buckets]) => ({
    name,
    summary: summarizeRates(buckets, bucketSec),
    ...(health.get(name) || { errors: 0, drops: 0, linkDowns: 0 }),
  })).sort((a, b) => (b.summary.rxBytes + b.summary.txBytes) - (a.summary.rxBytes + a.summary.txBytes))

  // tanpa pilihan (atau pilihan tak dikenal): interface dengan traffic terbesar
  const selected = byName.has(requested) ? requested : (items[0]?.name || '')
  const series = selected ?(byName.get(selected) || []) : []

  let heatmap = null
  if (selected) {
    const [heatRows] = await db.execute(
      `SELECT DAYOFWEEK(ts) AS dow, HOUR(ts) AS hour, AVG(rx_bps + tx_bps) AS bps
       FROM net_iface_samples WHERE interface_name = ? AND ts >= NOW() - INTERVAL ? SECOND
       GROUP BY dow, hour`,
      [selected, Math.round(ms / 1000)]
    ) as any[]
    heatmap = buildHeatmap((heatRows as any[]).map(r => ({ dow: Number(r.dow), hour: Number(r.hour), bps: Number(r.bps) })))
  }

  // availability WAN dari wan_events (nama interface WAN = yang pernah punya event)
  const to = Date.now()
  const from = to - ms
  const [evRows] = await db.execute(
    `SELECT interface_name, UNIX_TIMESTAMP(went_down_at) * 1000 AS went_down_at,
            IF(recovered_at IS NULL, NULL, UNIX_TIMESTAMP(recovered_at) * 1000) AS recovered_at
     FROM wan_events WHERE COALESCE(recovered_at, NOW()) >= NOW() - INTERVAL ? SECOND ORDER BY went_down_at DESC`,
    [Math.round(ms / 1000)]
  ) as any[]
  const events: WanEventRow[] = (evRows as any[]).map(e => ({
    interface_name: e.interface_name,
    went_down_at: Number(e.went_down_at),
    recovered_at: e.recovered_at === null ? null : Number(e.recovered_at),
  }))
  const wanNames = [...new Set(events.map(e => e.interface_name))]
  const availability = computeAvailability(events, wanNames, from, to)

  return {
    range, bucketSec, items, selected, series, heatmap, availability, events,
    insights: interfaceInsights(items.map(i => ({ name: i.name, errors: i.errors, drops: i.drops, linkDowns: i.linkDowns })), availability),
  }
})

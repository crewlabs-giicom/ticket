import { requireInfraUser } from '../../../utils/infra'
import { getDb } from '../../../database/index'
import {
  RANGES, parseRange, summarizeRates, buildHeatmap, cidrHostCapacity, subnetInsights, type RateBucket,
} from '../../../utils/mikrotik/analytics'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const q = getQuery(event)
  const range = parseRange(q.range)
  const { ms, bucketSec } = RANGES[range]
  const requested = typeof q.cidr === 'string' ? q.cidr : ''
  const secs = Math.round(ms / 1000)
  const db = getDb()

  const [rows] = await db.execute(
    `SELECT cidr, MAX(interface_name) AS iface, FLOOR(UNIX_TIMESTAMP(ts) / ?) * ? AS t,
            AVG(online) AS onlineAvg, MAX(online) AS onlineMax, AVG(total) AS totalAvg, MAX(total) AS totalMax,
            AVG(rx_bps) AS rxAvg, AVG(tx_bps) AS txAvg, MAX(rx_bps) AS rxMax, MAX(tx_bps) AS txMax
     FROM net_subnet_samples WHERE ts >= NOW() - INTERVAL ? SECOND
     GROUP BY cidr, t ORDER BY t`,
    [bucketSec, bucketSec, secs]
  ) as any[]

  interface Point extends RateBucket { onlineAvg: number; onlineMax: number; totalMax: number }
  const byCidr = new Map<string, { iface: string; points: Point[] }>()
  for (const r of rows as any[]) {
    const cur = byCidr.get(r.cidr) || { iface: r.iface || '', points: [] }
    cur.points.push({
      ts: Number(r.t) * 1000, rxAvg: Number(r.rxAvg), txAvg: Number(r.txAvg), rxMax: Number(r.rxMax), txMax: Number(r.txMax),
      onlineAvg: Number(r.onlineAvg), onlineMax: Number(r.onlineMax), totalMax: Number(r.totalMax),
    })
    byCidr.set(r.cidr, cur)
  }

  const items = [...byCidr].map(([cidr, { iface, points }]) => {
    const capacity = cidrHostCapacity(cidr)
    const total = points.length ? points[points.length - 1].totalMax : 0
    return {
      cidr, interface: iface, capacity, total,
      onlinePeak: points.length ? Math.max(...points.map(p => p.onlineMax)) : 0,
      onlineAvg: points.length ? points.reduce((a, p) => a + p.onlineAvg, 0) / points.length : 0,
      occupancyPct: capacity ? Math.round((total / capacity) * 100) : 0,
      summary: summarizeRates(points, bucketSec),
    }
  }).sort((a, b) => (b.summary.rxBytes + b.summary.txBytes) - (a.summary.rxBytes + a.summary.txBytes))

  const selected = byCidr.has(requested) ? requested : (items[0]?.cidr || '')
  const series = selected ?(byCidr.get(selected)?.points || []) : []

  let heatmap = null
  if (selected) {
    const [heatRows] = await db.execute(
      `SELECT DAYOFWEEK(ts) AS dow, HOUR(ts) AS hour, AVG(rx_bps + tx_bps) AS bps
       FROM net_subnet_samples WHERE cidr = ? AND ts >= NOW() - INTERVAL ? SECOND GROUP BY dow, hour`,
      [selected, secs]
    ) as any[]
    heatmap = buildHeatmap((heatRows as any[]).map(r => ({ dow: Number(r.dow), hour: Number(r.hour), bps: Number(r.bps) })))
  }

  return {
    range, bucketSec, items, selected, series, heatmap,
    insights: subnetInsights(items.map(i => ({ cidr: i.cidr, total: i.total, capacity: i.capacity }))),
  }
})

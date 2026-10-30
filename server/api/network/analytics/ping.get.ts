import { requireInfraUser } from '../../../utils/infra'
import { getDb } from '../../../database/index'
import { RANGES, parseRange, percentile, classifyQuality } from '../../../utils/mikrotik/analytics'
import { pingConfig } from '../../../utils/mikrotik/pingConfig'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const range = parseRange(getQuery(event).range)
  const { ms, bucketSec } = RANGES[range]
  const secs = Math.round(ms / 1000)
  const { thresholds } = pingConfig()
  const db = getDb()

  // per siklus: target terbaik (loss terendah, lalu RTT terendah) = wakil WAN; lalu rata-rata per bucket
  const [rows] = await db.execute(
    `SELECT interface_name AS name, FLOOR(UNIX_TIMESTAMP(ts) / ?) * ? AS t,
            AVG(rtt_avg) AS rttAvg, MAX(rtt_max) AS rttMax, AVG(jitter_ms) AS jitter, AVG(loss_pct) AS loss, COUNT(*) AS n
     FROM (
       SELECT s.* FROM net_ping_samples s
       JOIN (
         SELECT interface_name, ts, MIN(loss_pct * 100000 + COALESCE(rtt_avg, 99999)) AS k
         FROM net_ping_samples WHERE ts >= NOW() - INTERVAL ? SECOND GROUP BY interface_name, ts
       ) b ON b.interface_name = s.interface_name AND b.ts = s.ts AND b.k = s.loss_pct * 100000 + COALESCE(s.rtt_avg, 99999)
     ) best
     GROUP BY interface_name, t ORDER BY t`,
    [bucketSec, bucketSec, secs]
  ) as any[]

  const n = (v: any) => (v === null || v === undefined ? null : Number(v))
  const byName = new Map<string, Array<{ ts: number; rttAvg: number | null; rttMax: number | null; jitter: number | null; loss: number }>>()
  for (const r of rows as any[]) {
    const list = byName.get(r.name) || []
    list.push({ ts: Number(r.t) * 1000, rttAvg: n(r.rttAvg), rttMax: n(r.rttMax), jitter: n(r.jitter), loss: Number(r.loss) })
    byName.set(r.name, list)
  }

  const items = [...byName].map(([name, pts]) => {
    const lat = pts.map(p => p.rttAvg).filter((v): v is number => v !== null)
    const jit = pts.map(p => p.jitter).filter((v): v is number => v !== null)
    const bad = pts.filter(p => classifyQuality({ rttAvg: p.rttAvg, jitter: p.jitter, lossPct: p.loss }, thresholds).quality === 'bad').length
    return {
      name, points: pts,
      latencyAvg: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
      latencyP95: lat.length ? percentile(lat, 95) : null,
      latencyMax: pts.reduce((m, p) => Math.max(m, p.rttMax ?? 0), 0),
      jitterAvg: jit.length ? jit.reduce((a, b) => a + b, 0) / jit.length : null,
      lossAvg: pts.length ? pts.reduce((a, p) => a + p.loss, 0) / pts.length : 0,
      badPct: pts.length ? (bad / pts.length) * 100 : 0,
    }
  })

  const [events] = await db.execute(
    `SELECT interface_name AS name, reason, UNIX_TIMESTAMP(started_at) * 1000 AS startedAt,
            IF(ended_at IS NULL, NULL, UNIX_TIMESTAMP(ended_at) * 1000) AS endedAt
     FROM wan_quality_events WHERE COALESCE(ended_at, NOW()) >= NOW() - INTERVAL ? SECOND ORDER BY started_at DESC LIMIT 50`,
    [secs]
  ) as any[]

  return {
    range, bucketSec, items, thresholds,
    events: (events as any[]).map(e => ({ ...e, startedAt: Number(e.startedAt), endedAt: e.endedAt === null ? null : Number(e.endedAt) })),
  }
})

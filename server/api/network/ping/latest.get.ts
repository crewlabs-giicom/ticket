import { requireInfraUser } from '../../../utils/infra'
import { getDb } from '../../../database/index'
import { isMockMode } from '../../../utils/mikrotik/client'
import { getWanStatus, probeWan, wanQuality } from '../../../utils/mikrotik/service'
import { pingConfig } from '../../../utils/mikrotik/pingConfig'
import { classifyQuality, pickRepresentative } from '../../../utils/mikrotik/analytics'

// Status kualitas terakhir per WAN untuk badge. Data dari DB (diisi plugin mikrotik-ping);
// mock mode tidak menulis DB, jadi di-probe langsung.
export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const { thresholds, intervalSec } = pingConfig()

  if (isMockMode()) {
    const wan = (await getWanStatus()).filter(w => w.up)
    const items = []
    for (const w of wan) {
      const q = wanQuality(await probeWan(w.name))
      if (q) items.push({ name: w.name, target: q.target, rttAvg: q.rttAvg, jitter: q.jitter, lossPct: q.lossPct, quality: q.quality, reasons: q.reasons, ageSec: 0 })
    }
    return { items, openEvents: [], mock: true }
  }

  const db = getDb()
  // siklus terbaru per interface (ts maksimum), lalu pilih target terbaik
  const [rows] = await db.execute(
    `SELECT s.interface_name AS name, s.target, s.loss_pct AS lossPct, s.rtt_avg AS rttAvg, s.jitter_ms AS jitter,
            TIMESTAMPDIFF(SECOND, s.ts, NOW()) AS ageSec
     FROM net_ping_samples s
     JOIN (SELECT interface_name, MAX(ts) AS ts FROM net_ping_samples WHERE ts >= NOW() - INTERVAL 15 MINUTE GROUP BY interface_name) m
       ON m.interface_name = s.interface_name AND m.ts = s.ts`
  ) as any[]
  const byName = new Map<string, any[]>()
  for (const r of rows as any[]) {
    const list = byName.get(r.name) || []
    list.push({ ...r, lossPct: Number(r.lossPct), rttAvg: r.rttAvg === null ? null : Number(r.rttAvg), jitter: r.jitter === null ? null : Number(r.jitter), ageSec: Number(r.ageSec) })
    byName.set(r.name, list)
  }
  const items = []
  for (const [name, list] of byName) {
    const rep = pickRepresentative(list)!
    items.push({ ...rep, name, ...classifyQuality(rep, thresholds) })
  }
  const [open] = await db.execute('SELECT interface_name AS name, reason, started_at AS startedAt FROM wan_quality_events WHERE ended_at IS NULL') as any[]
  return { items, openEvents: open, intervalSec, mock: false }
})

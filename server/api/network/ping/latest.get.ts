import { requireInfraUser } from '../../../utils/infra'
import { getDb } from '../../../database/index'
import { isMockMode } from '../../../utils/mikrotik/client'
import { getWanPingSetups, probeWan, wanQuality } from '../../../utils/mikrotik/service'
import { pingConfig } from '../../../utils/mikrotik/pingConfig'
import { getPingDiag } from '../../../utils/mikrotik/pingDiag'
import { classifyQuality, pickRepresentative } from '../../../utils/mikrotik/analytics'

// Status kualitas terakhir per WAN untuk badge. Data dari DB (diisi plugin mikrotik-ping);
// mock mode tidak menulis DB, jadi di-probe langsung.
export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const { thresholds, intervalSec } = pingConfig()

  // WAN up yang setting ping-nya tidak bisa ditentukan dari router (belum ada routing table/rule khusus)
  const setups = await getWanPingSetups().catch(() => [])
  const unmeasurable = setups.filter(w => w.up && !w.setup).map(w => w.name)
  // diagnostik: setting yang dipakai untuk ping tiap WAN (IP sumber, tabel routing, gateway) hasil baca router
  const setupInfo = Object.fromEntries(setups.filter(w => w.setup).map(w => [w.name, w.setup]))

  if (isMockMode()) {
    const wan = setups.filter(w => w.up && w.setup)
    const items = []
    for (const w of wan) {
      const q = wanQuality(await probeWan(w.setup!))
      if (q) items.push({ name: w.name, target: q.target, rttAvg: q.rttAvg, jitter: q.jitter, lossPct: q.lossPct, quality: q.quality, reasons: q.reasons, ageSec: 0 })
    }
    return { items, unmeasurable, setups: setupInfo, diag: getPingDiag(), openEvents: [], mock: true }
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
  return { items, unmeasurable, setups: setupInfo, diag: getPingDiag(), openEvents: open, intervalSec, mock: false }
})

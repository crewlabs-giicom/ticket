import { getDb } from '../database/index'
import { notifyNetwork } from '../utils/netNotify'
import { isMockMode } from '../utils/mikrotik/client'
import { getWanPingSetups, probeWan, wanQuality } from '../utils/mikrotik/service'
import { pingConfig } from '../utils/mikrotik/pingConfig'
import { nextQualityTransitions, type Quality } from '../utils/mikrotik/analytics'

const REASON_LABEL = { latency: 'latency', jitter: 'jitter', loss: 'loss' } as const

function describe(q: { rttAvg: number | null; jitter: number | null; lossPct: number }) {
  const f = (v: number | null, unit: string) => (v === null ? '—' : `${Math.round(v)} ${unit}`)
  return `latency ${f(q.rttAvg, 'ms')}, jitter ${f(q.jitter, 'ms')}, loss ${Math.round(q.lossPct)}%`
}

// Probe kualitas WAN: router mem-ping tiap WAN yang up, simpan hasilnya, dan alert (in-app + DingTalk) bila
// kualitas buruk beberapa siklus berturut-turut. WAN down ditangani monitor WAN down, bukan di sini.
export default defineNitroPlugin(() => {
  let running = false
  let streaks = new Map<string, { bad: number; good: number }>()

  async function tick() {
    if (running) return
    running = true
    try {
      if (isMockMode()) return
      let wan
      try {
        // WAN yang up dan setting ping-nya (IP sumber + routing table) bisa ditentukan dari router; sisanya tidak diukur
        wan = (await getWanPingSetups()).filter(w => w.up && w.setup)
      } catch {
        return // router tidak terjangkau
      }

      const db = getDb()
      const current: Array<{ name: string; quality: Quality }> = []
      const lastDesc = new Map<string, string>()

      for (const w of wan) {
        let probe
        try {
          probe = await probeWan(w.setup!)
        } catch {
          return // router tidak terjangkau di tengah siklus
        }
        if (!probe.targets.length) continue
        const ph = probe.targets.map(() => '(NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',')
        const args = probe.targets.flatMap(t => [
          w.name, t.target, t.sent, t.received, t.lossPct.toFixed(2), t.rttMin, t.rttAvg, t.rttMax, t.jitter,
        ])
        await db.execute(
          `INSERT INTO net_ping_samples (ts, interface_name, target, sent, received, loss_pct, rtt_min, rtt_avg, rtt_max, jitter_ms) VALUES ${ph}`,
          args
        )
        const q = wanQuality(probe)
        if (q) {
          current.push({ name: w.name, quality: q.quality })
          lastDesc.set(w.name, `${describe(q)} (${q.reasons.map(r => REASON_LABEL[r]).join('+') || 'ok'})`)
        }
      }

      const [open] = await db.execute('SELECT id, interface_name, started_at FROM wan_quality_events WHERE ended_at IS NULL') as any[]
      const openRows = open as any[]
      const { streaks: next, wentBad, recovered } = nextQualityTransitions(streaks, current, new Set(openRows.map(e => e.interface_name)))
      streaks = next

      for (const name of wentBad) {
        const [r] = await db.execute(
          `INSERT INTO wan_quality_events (interface_name, reason)
           SELECT ?, ? FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM wan_quality_events WHERE interface_name = ? AND ended_at IS NULL)`,
          [name, lastDesc.get(name) || null, name]
        ) as any[]
        if (!(r as any).affectedRows) continue
        await notifyNetwork('KUALITAS WAN BURUK', `WAN ${name}: ${lastDesc.get(name) || 'kualitas buruk'}.`)
          .catch(e => console.error('[Ping] notifikasi gagal:', e?.message || e))
      }
      for (const name of recovered) {
        const [r] = await db.execute('UPDATE wan_quality_events SET ended_at = NOW() WHERE interface_name = ? AND ended_at IS NULL', [name]) as any[]
        if (!(r as any).affectedRows) continue
        await notifyNetwork('KUALITAS WAN PULIH', `WAN ${name} kembali normal.`)
          .catch(e => console.error('[Ping] notifikasi gagal:', e?.message || e))
      }
    } catch (e: any) {
      console.error('[Ping] probe error:', e?.message || e)
    } finally {
      running = false
    }
  }

  const { intervalSec } = pingConfig()
  setTimeout(tick, 20 * 1000)
  setInterval(tick, intervalSec * 1000)
})

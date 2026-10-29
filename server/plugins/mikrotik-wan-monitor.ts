import { getDb } from '../database/index'
import { broadcastToUsers } from '../utils/sse'
import { sendGroupAlert } from '../utils/dingtalk'
import { isMockMode } from '../utils/mikrotik/client'
import { getWanStatus } from '../utils/mikrotik/service'
import { nextWanTransitions } from '../utils/mikrotik/logic'

const POLL_MS = 30 * 1000

function formatDuration(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000))
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  return `${h} jam ${m % 60} menit`
}

// Deteksi WAN down dari MikroTik: notifikasi in-app ke semua admin + pesan grup DingTalk.
// Router tidak terjangkau BUKAN dianggap WAN down (hanya dilewati).
export default defineNitroPlugin(() => {
  let running = false
  let streaks = new Map<string, number>()

  async function notify(title: string, message: string) {
    const db = getDb()
    const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin' AND is_active = 1") as any[]
    const ids = (admins as any[]).map(a => a.id)
    for (const id of ids) {
      await db.execute(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'network')`,
        [id, title, message]
      )
    }
    broadcastToUsers(ids, 'notification', { title, message, type: 'network' })
    await sendGroupAlert(`${title}\n${message}`)
  }

  async function tick() {
    if (running) return
    running = true
    try {
      if (isMockMode()) return
      let wan
      try {
        wan = await getWanStatus()
      } catch {
        return // router tidak terjangkau / belum dikonfigurasi: bukan WAN down
      }

      const db = getDb()
      const [open] = await db.execute('SELECT id, interface_name, went_down_at FROM wan_events WHERE recovered_at IS NULL') as any[]
      const openRows = open as any[]
      const openNames = new Set<string>(openRows.map(e => e.interface_name))

      const { streaks: next, wentDown, recovered } = nextWanTransitions(streaks, wan, openNames)
      streaks = next

      for (const w of wentDown) {
        // klaim atomik: hanya satu proses yang berhasil menyisipkan event terbuka
        const [r] = await db.execute(
          `INSERT INTO wan_events (interface_name, comment)
           SELECT ?, ? FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM wan_events WHERE interface_name = ? AND recovered_at IS NULL)`,
          [w.name, w.comment || null, w.name]
        ) as any[]
        if (!(r as any).affectedRows) continue
        const label = w.comment ? `${w.name} (${w.comment})` : w.name
        await notify('WAN DOWN', `Interface WAN ${label} tidak aktif.`).catch(e => console.error('[WAN] notifikasi gagal:', e?.message || e))
      }

      for (const name of recovered) {
        const ev = openRows.find(e => e.interface_name === name)
        const [r] = await db.execute(
          'UPDATE wan_events SET recovered_at = NOW() WHERE interface_name = ? AND recovered_at IS NULL',
          [name]
        ) as any[]
        if (!(r as any).affectedRows) continue
        const dur = ev ? formatDuration(Date.now() - new Date(ev.went_down_at).getTime()) : null
        await notify('WAN PULIH', `Interface WAN ${name} aktif kembali${dur ? ` (down ${dur})` : ''}.`).catch(e => console.error('[WAN] notifikasi gagal:', e?.message || e))
      }
    } catch (e: any) {
      console.error('[WAN] monitor error:', e?.message || e)
    } finally {
      running = false
    }
  }

  setTimeout(tick, 20 * 1000)
  setInterval(tick, POLL_MS)
})

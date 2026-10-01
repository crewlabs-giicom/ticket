import { getDb } from '../database/index'
import { broadcastToUser } from '../utils/sse'

// Setiap jam: kirim notifikasi untuk jadwal pembersihan yang jatuh tempo/terlambat (maks 1x per hari per jadwal).
export default defineNitroPlugin(() => {
  async function remind() {
    try {
      const db = getDb()
      const [rows] = await db.execute(
        `SELECT s.id, s.title, s.assigned_to, s.next_due_date, r.name AS room_name
         FROM cleaning_schedules s JOIN rooms r ON r.id = s.room_id
         WHERE s.is_active = 1 AND s.assigned_to IS NOT NULL
           AND s.next_due_date <= CURDATE()
           AND (s.last_notified_date IS NULL OR s.last_notified_date < CURDATE())`
      )
      for (const s of rows as any[]) {
        const title = 'Jadwal pembersihan PC'
        const message = `${s.title} (${s.room_name}) jatuh tempo ${s.next_due_date}`
        await db.execute(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'cleaning')`,
          [s.assigned_to, title, message]
        )
        await db.execute('UPDATE cleaning_schedules SET last_notified_date = CURDATE() WHERE id = ?', [s.id])
        broadcastToUser(s.assigned_to, 'notification', { title, message, type: 'cleaning' })
      }
    } catch {}
  }

  setTimeout(remind, 30 * 1000)
  setInterval(remind, 60 * 60 * 1000)
})

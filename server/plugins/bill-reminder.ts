import { getDb } from '../database/index'
import { broadcastToUsers } from '../utils/sse'
import { sendGroupAlert } from '../utils/dingtalk'
import { billStage } from '../utils/bills'

const LABEL: Record<string, string> = {
  early: 'akan jatuh tempo', d3: 'jatuh tempo dalam 3 hari', d1: 'jatuh tempo besok', d0: 'jatuh tempo HARI INI', over: 'SUDAH LEWAT jatuh tempo',
}

// Setiap jam: ingatkan tagihan yang mendekati/melewati jatuh tempo ke admin & staff (in-app + DingTalk).
// Satu notifikasi per tahap (H-n, H-3, H-1, hari H); tagihan terlewat diingatkan sekali per hari.
export default defineNitroPlugin(() => {
  async function remind() {
    try {
      const db = getDb()
      const [rows] = await db.execute(
        `SELECT id, provider, type, type_other, title, due_date, remind_days, last_notified_date, last_notified_stage,
                DATEDIFF(due_date, CURDATE()) AS days_left
         FROM bills WHERE is_active = 1 AND DATEDIFF(due_date, CURDATE()) <= remind_days`
      )
      const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
      for (const b of rows as any[]) {
        const stage = billStage(Number(b.days_left), b.remind_days)
        if (!stage) continue
        const lastDate = b.last_notified_date ? String(b.last_notified_date).slice(0, 10) : null
        if (stage === b.last_notified_stage && !(stage === 'over' && lastDate !== today)) continue

        // klaim atomik: hanya satu proses/siklus yang boleh mengirim untuk kondisi ini
        const [claim] = await db.execute(
          'UPDATE bills SET last_notified_stage = ?, last_notified_date = CURDATE() WHERE id = ? AND last_notified_stage <=> ? AND last_notified_date <=> ?',
          [stage, b.id, b.last_notified_stage, lastDate]
        ) as any[]
        if (!claim.affectedRows) continue

        const jenis = b.type === 'lainnya' ? b.type_other : b.type
        const name = [b.provider, jenis, b.title].filter(Boolean).join(' · ')
        const title = 'Pengingat tagihan'
        const message = `${name} ${LABEL[stage]} (${String(b.due_date).slice(0, 10)})`

        const [recipients] = await db.execute("SELECT id FROM users WHERE role IN ('admin', 'staff') AND is_active = 1") as any[]
        const ids = (recipients as any[]).map(u => u.id)
        for (const id of ids) {
          await db.execute(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'bill')`, [id, title, message])
        }
        broadcastToUsers(ids, 'notification', { title, message, type: 'bill' })
        void sendGroupAlert(`${title}\n${message}`)
      }
    } catch (e: any) {
      console.error('[bill-reminder]', e?.message || e)
    }
  }

  setTimeout(remind, 30 * 1000)
  setInterval(remind, 60 * 60 * 1000)
})

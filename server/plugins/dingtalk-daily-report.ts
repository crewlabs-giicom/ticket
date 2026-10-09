import { getDb } from '../database/index'
import { todayWIB } from '../utils/date'
import { loadDingtalkSettings, isConfigured, sendDailyReport } from '../utils/dingtalk'

// Setiap menit: bila sudah lewat jam kirim (WIB) dan hari ini belum terkirim, kirim Daily Report ke DingTalk.
export default defineNitroPlugin(() => {
  let running = false
  let failDate = ''
  let failCount = 0
  const MAX_RETRIES = 5

  async function tick() {
    if (running) return
    running = true
    try {
      const db = getDb()
      const s = await loadDingtalkSettings(db)
      if (!s || !s.enabled || !isConfigured(s)) return

      // Minggu libur: tidak ada pengiriman otomatis (manual tetap bisa)
      if (new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' }) === 'Sun') return

      const today = todayWIB()
      const nowHm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
      if (nowHm < s.send_time || s.last_sent_date === today) return
      if (failDate === today && failCount >= MAX_RETRIES) return

      // klaim atomik agar tidak terkirim ganda (restart / banyak proses)
      const [r] = await db.execute(
        'UPDATE dingtalk_settings SET last_sent_date = ? WHERE id = 1 AND (last_sent_date IS NULL OR last_sent_date <> ?)',
        [today, today]
      ) as any[]
      if (!(r as any).affectedRows) return

      try {
        await sendDailyReport({ date: today, trigger: 'auto' })
      } catch {
        if (failDate !== today) { failDate = today; failCount = 0 }
        failCount++
        // gagal: lepas klaim supaya dicoba lagi di menit berikutnya
        await db.execute('UPDATE dingtalk_settings SET last_sent_date = NULL WHERE id = 1 AND last_sent_date = ?', [today]).catch(() => {})
      }
    } catch {
      // tabel belum siap / DB error: coba lagi di tick berikutnya
    } finally {
      running = false
    }
  }

  setTimeout(tick, 45 * 1000)
  setInterval(tick, 60 * 1000)
})

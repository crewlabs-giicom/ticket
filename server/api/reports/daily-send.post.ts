import { requireAuth } from '../../utils/rbac'
import { sendDailyReport } from '../../utils/dingtalk'
import { todayWIB } from '../../utils/date'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role === 'customer') throw createError({ statusCode: 403 })

  const body = await readBody(event)
  const date = String(body?.date || todayWIB())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, message: 'Tanggal tidak valid' })

  // Staff hanya boleh mengirim laporan dirinya sendiri; admin: user_id kosong = semua staff di setting
  const userId = user.role === 'staff' ? user.id : (body?.user_id ? Number(body.user_id) : null)

  try {
    const r = await sendDailyReport({ date, userIds: userId ? [userId] : null, trigger: 'manual', sentBy: user.id })
    return { success: true, ...r }
  } catch (e: any) {
    throw createError({ statusCode: 502, message: String(e?.message || e) })
  }
})

import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const body = await readBody(event)
  const sendTime = String(body.send_time || '17:00')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) {
    throw createError({ statusCode: 400, message: 'Format jam harus HH:MM' })
  }
  const staffIds = Array.isArray(body.staff_user_ids) ? body.staff_user_ids.map(Number).filter(Boolean) : []

  const db = getDb()
  const fields = ['app_key = ?', 'robot_code = ?', 'open_conversation_id = ?', 'enabled = ?', 'send_time = ?', 'staff_user_ids = ?']
  const params: any[] = [
    String(body.app_key || '').trim(),
    String(body.robot_code || '').trim(),
    String(body.open_conversation_id || '').trim(),
    body.enabled ? 1 : 0,
    sendTime,
    JSON.stringify(staffIds),
  ]
  // secret hanya diganti bila diisi
  if (body.app_secret) { fields.push('app_secret = ?'); params.push(String(body.app_secret).trim()) }

  await db.execute(`UPDATE dingtalk_settings SET ${fields.join(', ')} WHERE id = 1`, params)
  return { success: true }
})

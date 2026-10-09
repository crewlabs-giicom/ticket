import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'
import { loadDingtalkSettings, parseStaffIds } from '../../utils/dingtalk'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const s = await loadDingtalkSettings(getDb())
  if (!s) return { success: true, data: null }
  return {
    success: true,
    data: {
      app_key: s.app_key,
      has_secret: !!s.app_secret,
      robot_code: s.robot_code,
      open_conversation_id: s.open_conversation_id,
      enabled: !!s.enabled,
      send_time: s.send_time,
      staff_user_ids: parseStaffIds(s),
      last_sent_date: s.last_sent_date,
    },
  }
})

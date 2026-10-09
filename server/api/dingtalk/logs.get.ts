import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const [rows] = await getDb().execute(
    `SELECT l.id, l.trigger_type, l.report_date, l.status, l.detail, l.created_at, u.name AS sent_by_name
     FROM dingtalk_send_logs l LEFT JOIN users u ON u.id = l.sent_by
     ORDER BY l.id DESC LIMIT 30`
  )
  return { success: true, data: rows }
})

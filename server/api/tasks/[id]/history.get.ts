import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const [rows] = await db.execute(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.entity_type = 'task' AND al.entity_id = ?
     ORDER BY al.created_at DESC`,
    [id]
  )
  return { data: rows }
})

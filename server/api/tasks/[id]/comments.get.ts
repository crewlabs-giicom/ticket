import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const [rows] = await db.execute(
    `SELECT tc.*, u.name as user_name, u.role as user_role
     FROM task_comments tc
     LEFT JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = ?
     ORDER BY tc.created_at ASC`,
    [id]
  )
  return { data: rows }
})

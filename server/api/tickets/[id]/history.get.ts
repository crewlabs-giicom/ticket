import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const [rows] = await db.execute(
    `SELECT al.*, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.entity_type = 'ticket' AND al.entity_id = ?
     ORDER BY al.created_at ASC`,
    [id]
  )
  return { data: rows }
})

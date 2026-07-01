import { getDb } from '../database/index'
import { requireAuth } from '../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const query = getQuery(event)
  const { entity_type, entity_id } = query

  if (!entity_type || !entity_id) throw createError({ statusCode: 400, statusMessage: 'entity_type and entity_id required' })

  const [rows] = await db.execute(
    `SELECT r.*, u.name as revised_by_name
     FROM due_date_revisions r
     LEFT JOIN users u ON u.id = r.revised_by
     WHERE r.entity_type = ? AND r.entity_id = ?
     ORDER BY r.revised_at DESC`,
    [String(entity_type), Number(entity_id)]
  )

  return rows
})

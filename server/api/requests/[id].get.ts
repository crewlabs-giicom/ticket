import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[row]] = await db.execute(
    `SELECT r.*, u.name as requester_name, p.name as project_name,
            prd.title as prd_title, prd.status as prd_status
     FROM requests r
     LEFT JOIN users u ON u.id = r.requester_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN prds prd ON prd.id = r.prd_id
     WHERE r.id = ?`,
    [id]
  ) as any[]

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  if (user.role === 'customer' && row.requester_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return row
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[row]] = await db.execute('SELECT id, status, title FROM requests WHERE id = ?', [id]) as any[]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Request not found' })

  await db.execute(`UPDATE requests SET status = 'rejected' WHERE id = ?`, [id])

  await logActivity(db, {
    entity_type: 'request', entity_id: id,
    action: 'status_changed',
    from_value: row.status, to_value: 'rejected',
    label: `Request "${row.title}" ditolak oleh ${user.name}`,
    user_id: user.id,
  })

  return { success: true }
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[row]] = await db.execute('SELECT id FROM requests WHERE id = ?', [id]) as any[]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Request not found' })

  await db.execute(`UPDATE requests SET status = 'standalone', prd_id = NULL WHERE id = ?`, [id])
  return { success: true }
})

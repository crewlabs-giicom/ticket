import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  await db.execute('DELETE FROM tasks WHERE id = ?', [id])
  return { ok: true }
})

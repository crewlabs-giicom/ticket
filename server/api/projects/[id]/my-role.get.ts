import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const projectId = getRouterParam(event, 'id')

  if (user.role === 'admin') return { project_role: 'admin' }

  const [rows] = await db.execute(
    'SELECT project_role FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, user.id]
  ) as any[]

  return { project_role: (rows as any[])[0]?.project_role ?? null }
})

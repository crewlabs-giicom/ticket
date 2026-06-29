import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')

  if (user.role === 'customer') {
    const [rows] = await db.execute(
      "SELECT t.created_by, t.project_id FROM tasks t WHERE t.id = ?", [id]
    ) as any[]
    const task = (rows as any[])[0]
    if (!task) throw createError({ statusCode: 404 })
    // Customer hanya bisa hapus task yang dia buat dan dia adalah project admin
    if (task.created_by !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const [paRows] = await db.execute(
      "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND project_role = 'admin' LIMIT 1",
      [task.project_id, user.id]
    )
    if (!(paRows as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await db.execute('DELETE FROM tasks WHERE id = ?', [id])
  return { ok: true }
})

import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const projectId = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
    const offset = (page - 1) * limit
    const like = `%${search}%`

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ? AND (u.name LIKE ? OR u.email LIKE ?)`,
      [projectId, like, like]
    )
    const total = (countRows as any[])[0].total as number

    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, u.role, u.avatar
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ? AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.name ASC LIMIT ? OFFSET ?`,
      [projectId, like, like, limit, offset]
    )
    return { success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    if (!body.user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })
    await db.execute(
      'INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)',
      [projectId, body.user_id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    const body = await readBody(event)
    if (!body.user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })
    await db.execute(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, body.user_id]
    )
    return { success: true }
  }
})

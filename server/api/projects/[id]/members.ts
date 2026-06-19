import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const projectId = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(`
      SELECT u.id, u.name, u.email, u.role, u.avatar
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY u.name ASC
    `, [projectId])
    return { success: true, data: rows }
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

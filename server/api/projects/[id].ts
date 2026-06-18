import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    db.prepare(`UPDATE projects SET name=?, description=?, is_active=?, updated_at=datetime('now') WHERE id=?`).run(body.name, body.description, body.is_active ?? 1, id)
    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    db.prepare('UPDATE projects SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  }
})

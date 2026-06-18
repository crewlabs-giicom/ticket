import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    await db.execute(
      'UPDATE projects SET name=?, description=?, is_active=?, updated_at=NOW() WHERE id=?',
      [body.name, body.description, body.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    await db.execute('UPDATE projects SET is_active=0 WHERE id=?', [id])
    return { success: true }
  }
})

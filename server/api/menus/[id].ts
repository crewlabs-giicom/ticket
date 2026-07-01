import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    await db.execute(
      'UPDATE menus SET name=?, path=?, icon=?, order_index=?, role=?, is_active=?, parent_id=? WHERE id=?',
      [body.name, body.path || null, body.icon, body.order_index, body.role, body.is_active ?? 1, body.parent_id || null, id]
    )
    return { success: true }
  }
  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM menus WHERE id=?', [id])
    return { success: true }
  }
})

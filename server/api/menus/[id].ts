import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    db.prepare('UPDATE menus SET name=?, path=?, icon=?, order_index=?, role=?, is_active=? WHERE id=?').run(body.name, body.path, body.icon, body.order_index, body.role, body.is_active ?? 1, id)
    return { success: true }
  }
  if (event.method === 'DELETE') {
    db.prepare('DELETE FROM menus WHERE id=?').run(id)
    return { success: true }
  }
})

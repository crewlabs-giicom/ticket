import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    db.prepare('UPDATE priorities SET name=?, color=?, order_index=?, sla_hours=? WHERE id=?').run(body.name, body.color, body.order_index, body.sla_hours, id)
    return { success: true }
  }
  if (event.method === 'DELETE') {
    db.prepare('DELETE FROM priorities WHERE id=?').run(id)
    return { success: true }
  }
})

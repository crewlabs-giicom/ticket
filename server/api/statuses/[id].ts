import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    db.prepare('UPDATE ticket_statuses SET name=?, color=?, order_index=?, is_resolved=? WHERE id=?').run(body.name, body.color, body.order_index, body.is_resolved ? 1 : 0, id)
    return { success: true }
  }
  if (event.method === 'DELETE') {
    db.prepare('DELETE FROM ticket_statuses WHERE id=?').run(id)
    return { success: true }
  }
})

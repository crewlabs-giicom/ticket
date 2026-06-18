import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    await db.execute(
      'UPDATE ticket_statuses SET name=?, color=?, order_index=?, is_resolved=? WHERE id=?',
      [body.name, body.color, body.order_index, body.is_resolved ? 1 : 0, id]
    )
    return { success: true }
  }
  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM ticket_statuses WHERE id=?', [id])
    return { success: true }
  }
})

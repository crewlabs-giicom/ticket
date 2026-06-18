import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    await db.execute(
      'UPDATE priorities SET name=?, color=?, order_index=?, sla_hours=? WHERE id=?',
      [body.name, body.color, body.order_index, body.sla_hours, id]
    )
    return { success: true }
  }
  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM priorities WHERE id=?', [id])
    return { success: true }
  }
})

import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    await db.execute(
      'UPDATE system_menus SET module=?, type=?, name=?, is_active=?, order_index=? WHERE id=?',
      [body.module, body.type || null, body.name || null, body.is_active ?? 1, body.order_index ?? 0, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM system_menus WHERE id=?', [id])
    return { success: true }
  }
})

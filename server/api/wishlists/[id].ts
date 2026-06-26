import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  // Verify ownership
  const [rows] = await db.execute(
    'SELECT id FROM wishlists WHERE id = ? AND user_id = ?', [id, user.id]
  ) as any[]
  if (!(rows as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Not found' })

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const fields: string[] = []
    const params: any[] = []
    if (body?.title !== undefined) { fields.push('title = ?'); params.push(body.title.trim() || 'Catatan') }
    if (body?.color !== undefined) { fields.push('color = ?'); params.push(body.color) }
    if (body?.is_pinned !== undefined) { fields.push('is_pinned = ?'); params.push(body.is_pinned ? 1 : 0) }
    if (body?.pin_x !== undefined) { fields.push('pin_x = ?'); params.push(body.pin_x) }
    if (body?.pin_y !== undefined) { fields.push('pin_y = ?'); params.push(body.pin_y) }
    if (body?.is_minimized !== undefined) { fields.push('is_minimized = ?'); params.push(body.is_minimized ? 1 : 0) }
    if (fields.length) {
      fields.push('updated_at = NOW()')
      params.push(id, user.id)
      await db.execute(`UPDATE wishlists SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params)
    }
    const [updated] = await db.execute('SELECT * FROM wishlists WHERE id = ?', [id]) as any[]
    return { success: true, data: (updated as any[])[0] }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM wishlists WHERE id = ? AND user_id = ?', [id, user.id])
    return { success: true }
  }
})

import { getDb } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const wishlistId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))

  // Verify wishlist ownership
  const [owns] = await db.execute(
    'SELECT id FROM wishlists WHERE id = ? AND user_id = ?', [wishlistId, user.id]
  ) as any[]
  if (!(owns as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Not found' })

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const fields: string[] = []
    const params: any[] = []
    if (body?.content !== undefined) { fields.push('content = ?'); params.push(body.content) }
    if (body?.is_checked !== undefined) { fields.push('is_checked = ?'); params.push(body.is_checked ? 1 : 0) }
    if (body?.order_index !== undefined) { fields.push('order_index = ?'); params.push(body.order_index) }
    if (fields.length) {
      fields.push('updated_at = NOW()')
      params.push(itemId, wishlistId)
      await db.execute(
        `UPDATE wishlist_items SET ${fields.join(', ')} WHERE id = ? AND wishlist_id = ?`, params
      )
    }
    const [rows] = await db.execute('SELECT * FROM wishlist_items WHERE id = ?', [itemId]) as any[]
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM wishlist_items WHERE id = ? AND wishlist_id = ?', [itemId, wishlistId])
    return { success: true }
  }
})

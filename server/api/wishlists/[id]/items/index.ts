import { getDb } from '../../../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const wishlistId = Number(getRouterParam(event, 'id'))

  // Verify ownership
  const [owns] = await db.execute(
    'SELECT id FROM wishlists WHERE id = ? AND user_id = ?', [wishlistId, user.id]
  ) as any[]
  if (!(owns as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Not found' })

  if (event.method === 'GET') {
    const [items] = await db.execute(
      'SELECT * FROM wishlist_items WHERE wishlist_id = ? ORDER BY order_index ASC, id ASC',
      [wishlistId]
    ) as any[]
    return { success: true, data: items }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const content = body?.content?.trim() ?? ''

    const [[{ maxIdx }]] = await db.execute(
      'SELECT COALESCE(MAX(order_index), -1) as maxIdx FROM wishlist_items WHERE wishlist_id = ?',
      [wishlistId]
    ) as any[]

    const [res] = await db.execute(
      'INSERT INTO wishlist_items (wishlist_id, content, order_index) VALUES (?, ?, ?)',
      [wishlistId, content, (maxIdx as number) + 1]
    ) as [ResultSetHeader, any]

    const [rows] = await db.execute('SELECT * FROM wishlist_items WHERE id = ?', [res.insertId]) as any[]
    return { success: true, data: (rows as any[])[0] }
  }
})

import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [notes] = await db.execute(
      `SELECT w.*,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', i.id, 'wishlist_id', i.wishlist_id, 'content', i.content,
                      'is_checked', i.is_checked, 'order_index', i.order_index,
                      'created_at', i.created_at, 'updated_at', i.updated_at)
          ORDER BY i.order_index ASC, i.id ASC
        ) FROM wishlist_items i WHERE i.wishlist_id = w.id) as items
       FROM wishlists w
       WHERE w.user_id = ?
       ORDER BY w.created_at ASC`,
      [user.id]
    ) as any[]

    const result = (notes as any[]).map(n => ({
      ...n,
      items: n.items ? JSON.parse(n.items) : [],
    }))

    return { success: true, data: result }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const title = body?.title?.trim() || 'Catatan'
    const color = body?.color || '#fef08a'

    const [res] = await db.execute(
      'INSERT INTO wishlists (user_id, title, color) VALUES (?, ?, ?)',
      [user.id, title, color]
    ) as [ResultSetHeader, any]

    const [rows] = await db.execute(
      'SELECT * FROM wishlists WHERE id = ?', [res.insertId]
    ) as any[]

    return { success: true, data: { ...(rows as any[])[0], items: [] } }
  }
})

import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    if (user.role === 'admin') {
      const [rows] = await db.execute('SELECT * FROM menus ORDER BY parent_id IS NOT NULL ASC, order_index ASC')
      return { success: true, data: rows }
    }
    const [rows] = await db.execute(
      'SELECT * FROM menus WHERE is_active=1 AND (role="all" OR role=?) ORDER BY parent_id IS NOT NULL ASC, order_index ASC',
      [user.role]
    )
    return { success: true, data: rows }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const [r] = await db.execute(
      'INSERT INTO menus (name, path, icon, order_index, role, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
      [body.name, body.path || null, body.icon, body.order_index || 99, body.role || 'all', body.parent_id || null]
    )
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM menus WHERE id=?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE menus SET order_index=? WHERE id=?', [item.order_index, item.id])
        }
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }
      return { success: true }
    }
  }
})

import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const query = user.role === 'admin'
      ? 'SELECT * FROM system_menus ORDER BY module ASC, order_index ASC, type ASC, name ASC'
      : 'SELECT * FROM system_menus WHERE is_active=1 ORDER BY module ASC, order_index ASC, type ASC, name ASC'
    const [rows] = await db.execute(query)
    return { success: true, data: rows }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const [r] = await db.execute(
      'INSERT INTO system_menus (module, type, name, order_index) VALUES (?, ?, ?, ?)',
      [body.module, body.type || null, body.name || null, body.order_index || 99]
    )
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM system_menus WHERE id = ?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE system_menus SET order_index=? WHERE id=?', [item.order_index, item.id])
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

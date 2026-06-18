import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [rows] = await db.execute('SELECT * FROM priorities ORDER BY order_index ASC')
    return { success: true, data: rows }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const [r] = await db.execute(
      'INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)',
      [body.name, body.color || '#6366f1', body.order_index || 99, body.sla_hours || 24]
    )
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM priorities WHERE id = ?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE priorities SET order_index=? WHERE id=?', [item.order_index, item.id])
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

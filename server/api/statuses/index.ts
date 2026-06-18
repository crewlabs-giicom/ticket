import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [rows] = await db.execute('SELECT * FROM ticket_statuses ORDER BY order_index ASC')
    return { success: true, data: rows }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const [r] = await db.execute(
      'INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)',
      [body.name, body.color || '#6366f1', body.order_index || 99, body.is_resolved ? 1 : 0]
    )
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM ticket_statuses WHERE id = ?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE ticket_statuses SET order_index=? WHERE id=?', [item.order_index, item.id])
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

import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const q = getQuery(event)
    const conditions: string[] = []
    const params: any[] = []

    if (user.role !== 'admin') conditions.push('sm.is_active=1')

    if (q.project_id) {
      conditions.push('(sm.project_id = ? OR sm.project_id IS NULL)')
      params.push(Number(q.project_id))
    } else if (user.role === 'staff' || user.role === 'customer') {
      conditions.push('(sm.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR sm.project_id IS NULL)')
      params.push(user.id)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [rows] = await db.execute(
      `SELECT sm.*, p.name as project_name FROM system_menus sm LEFT JOIN projects p ON p.id = sm.project_id ${where} ORDER BY sm.module ASC, sm.order_index ASC, sm.type ASC, sm.name ASC`,
      params
    )
    return { success: true, data: rows }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const [r] = await db.execute(
      'INSERT INTO system_menus (module, type, name, order_index, project_id) VALUES (?, ?, ?, ?, ?)',
      [body.module, body.type || null, body.name || null, body.order_index || 99, body.project_id || null]
    )
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT sm.*, p.name as project_name FROM system_menus sm LEFT JOIN projects p ON p.id = sm.project_id WHERE sm.id = ?', [insertId])
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

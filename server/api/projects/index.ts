import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    let roleWhere = ''
    const roleParams: any[] = []
    if (user.role === 'customer' || user.role === 'staff') {
      roleWhere = 'WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
      roleParams.push(user.id)
    }

    const [projects] = await db.execute(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.project_id = p.id) AS ticket_count,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'done') AS task_done,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status IN ('todo','in_progress','review')) AS task_waiting,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.due_date < NOW() AND tk.status IN ('todo','in_progress','review')) AS task_overdue,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT GROUP_CONCAT(u.name ORDER BY u.id SEPARATOR '||')
         FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = p.id) AS member_names
      FROM projects p
      ${roleWhere}
      ORDER BY p.sort_order ASC, p.id ASC
    `, roleParams)
    return { success: true, data: projects }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)

    // Reorder endpoint: PUT-style batch via POST array
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE projects SET sort_order=? WHERE id=?', [item.sort_order, item.id])
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

    const [r] = await db.execute('INSERT INTO projects (name, description) VALUES (?, ?)', [body.name, body.description || ''])
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM projects WHERE id = ?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const conn = await db.getConnection()
      try {
        await conn.beginTransaction()
        for (const item of body) {
          await conn.execute('UPDATE projects SET sort_order=? WHERE id=?', [item.sort_order, item.id])
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

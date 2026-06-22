import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    let roleWhere = ''
    const roleParams: any[] = []
    if (user.role === 'customer') {
      roleWhere = 'WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
      roleParams.push(user.id)
    } else if (user.role === 'staff') {
      roleWhere = 'WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
      roleParams.push(user.id)
    }

    const [projects] = await db.execute(`
      SELECT p.*,
        COUNT(DISTINCT t.id) AS ticket_count,
        COUNT(DISTINCT tk.id) AS task_count,
        SUM(CASE WHEN tk.status = 'done' THEN 1 ELSE 0 END) AS task_done,
        SUM(CASE WHEN tk.status IN ('todo','in_progress','review') THEN 1 ELSE 0 END) AS task_waiting,
        SUM(CASE WHEN tk.due_date < NOW() AND tk.status IN ('todo','in_progress','review') THEN 1 ELSE 0 END) AS task_overdue,
        COUNT(DISTINCT pm.user_id) AS member_count,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.id SEPARATOR '||') AS member_names
      FROM projects p
      LEFT JOIN tickets t ON t.project_id = p.id
      LEFT JOIN tasks tk ON tk.project_id = p.id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = pm.user_id
      ${roleWhere}
      GROUP BY p.id
      ORDER BY p.id DESC
    `, roleParams)
    return { success: true, data: projects }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const [r] = await db.execute('INSERT INTO projects (name, description) VALUES (?, ?)', [body.name, body.description || ''])
    const insertId = (r as ResultSetHeader).insertId
    const [rows] = await db.execute('SELECT * FROM projects WHERE id = ?', [insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

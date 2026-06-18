import { getDb } from '../../database/index'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [projects] = await db.execute(`
      SELECT p.*, COUNT(t.id) as ticket_count
      FROM projects p
      LEFT JOIN tickets t ON t.project_id = p.id
      GROUP BY p.id ORDER BY p.id DESC
    `)
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

import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const projects = db.prepare(`
      SELECT p.*, COUNT(t.id) as ticket_count
      FROM projects p
      LEFT JOIN tickets t ON t.project_id = p.id
      GROUP BY p.id ORDER BY p.id DESC
    `).all()
    return { success: true, data: projects }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const r = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(body.name, body.description || '')
    return { success: true, data: db.prepare('SELECT * FROM projects WHERE id = ?').get(r.lastInsertRowid) }
  }
})

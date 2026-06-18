import { getDb } from '../../database/index'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const users = db.prepare('SELECT id, name, email, role, avatar, is_active, created_at FROM users ORDER BY id DESC').all()
    return { success: true, data: users }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const { name, email, password, role } = body
    if (!name || !email || !password) throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap' })
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (exists) throw createError({ statusCode: 409, statusMessage: 'Email sudah ada' })
    const r = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashPassword(password), role || 'staff')
    return { success: true, data: db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(r.lastInsertRowid) }
  }
})

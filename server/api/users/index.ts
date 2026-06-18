import { getDb } from '../../database/index'
import { hashPassword } from '../../utils/auth'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [users] = await db.execute('SELECT id, name, email, role, avatar, is_active, created_at FROM users ORDER BY id DESC')
    return { success: true, data: users }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const { name, email, password, role } = body
    if (!name || !email || !password) throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap' })
    const [existRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
    if ((existRows as any[]).length > 0) throw createError({ statusCode: 409, statusMessage: 'Email sudah ada' })
    const [r] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashPassword(password), role || 'staff']
    )
    const insertId = (r as ResultSetHeader).insertId
    const [newUser] = await db.execute('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [insertId])
    return { success: true, data: (newUser as any[])[0] }
  }
})

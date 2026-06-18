import { getDb } from '../../database/index'
import { hashPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, password } = body || {}
  if (!name || !email || !password) throw createError({ statusCode: 400, statusMessage: 'Semua field wajib diisi' })

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar' })

  const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashPassword(password), 'customer')
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid) as any

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
  setAuthCookie(event, token)
  return { success: true, user }
})

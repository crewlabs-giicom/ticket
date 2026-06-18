import { getDb } from '../../database/index'
import { hashPassword, signToken, setAuthCookie } from '../../utils/auth'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, password } = body || {}
  if (!name || !email || !password) throw createError({ statusCode: 400, statusMessage: 'Semua field wajib diisi' })

  const db = getDb()
  const [existRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
  if ((existRows as any[]).length > 0) throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar' })

  const [result] = await db.execute(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashPassword(password), 'customer']
  )
  const insertId = (result as ResultSetHeader).insertId

  const [userRows] = await db.execute('SELECT id, name, email, role FROM users WHERE id = ?', [insertId])
  const user = (userRows as any[])[0]

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
  setAuthCookie(event, token)
  return { success: true, user }
})

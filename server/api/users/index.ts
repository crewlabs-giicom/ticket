import { getDb } from '../../database/index'
import { hashPassword } from '../../utils/auth'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const q = getQuery(event)
    const limit = Math.min(Number(q.limit) || 20, 100)
    const page = Math.max(Number(q.page) || 1, 1)
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []
    if (q.search) { conditions.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${q.search}%`, `%${q.search}%`) }
    if (q.role) { conditions.push('role = ?'); params.push(q.role) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM users ${where}`, params) as any[]
    const [users] = await db.execute(`SELECT id, name, email, role, avatar, is_active, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
    return { success: true, data: users, total, page, limit, totalPages: Math.ceil(total / limit) }
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

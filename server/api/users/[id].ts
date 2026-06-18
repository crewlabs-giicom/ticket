import { getDb } from '../../database/index'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute('SELECT id, name, email, role, avatar, is_active FROM users WHERE id = ?', [id])
    const u = (rows as any[])[0]
    if (!u) throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan' })
    return { success: true, data: u }
  }

  if (event.method === 'PUT') {
    if (user.role !== 'admin' && user.id !== Number(id)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const { name, email, password, role, is_active } = body
    if (password) {
      await db.execute(
        'UPDATE users SET name=?, email=?, password=?, role=?, is_active=?, updated_at=NOW() WHERE id=?',
        [name, email, hashPassword(password), role, is_active ?? 1, id]
      )
    } else {
      await db.execute(
        'UPDATE users SET name=?, email=?, role=?, is_active=?, updated_at=NOW() WHERE id=?',
        [name, email, role, is_active ?? 1, id]
      )
    }
    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    await db.execute('UPDATE users SET is_active=0 WHERE id=?', [id])
    return { success: true }
  }
})

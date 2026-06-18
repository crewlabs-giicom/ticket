import { getDb } from '../../database/index'

export default defineEventHandler((event) => {
  const user = event.context.user
  const db = getDb()
  const u = db.prepare('SELECT id, name, email, role, avatar, is_active FROM users WHERE id = ?').get(user.id) as any
  if (!u) throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan' })
  return { success: true, user: u }
})

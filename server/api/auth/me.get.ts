import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const db = getDb()
  const [rows] = await db.execute('SELECT id, name, email, role, avatar, is_active FROM users WHERE id = ?', [user.id])
  const u = (rows as any[])[0]
  if (!u) throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan' })
  return { success: true, user: u }
})

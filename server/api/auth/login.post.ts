import { getDb } from '../../database/index'
import { verifyPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body || {}

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email dan password wajib diisi' })
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any
  if (!user || !verifyPassword(password, user.password)) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau password salah' })
  }

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
  setAuthCookie(event, token)

  return {
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
  }
})

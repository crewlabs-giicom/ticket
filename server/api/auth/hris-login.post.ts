import { getDb } from '../../database'
import { hashPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email dan password wajib diisi' })
  }

  // Verifikasi ke HRIS giisystem
  let hrisUser: { name: string; email: string }
  try {
    const res = await $fetch<any>('https://backbone.giisystem.com/api/hris/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    if (res?.code !== 20020 || !res?.data?.user) {
      throw new Error('HRIS auth failed')
    }
    hrisUser = { name: res.data.user.name, email: res.data.user.email }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Akun HRIS tidak ditemukan atau password salah' })
  }

  const hash = hashPassword(password)
  const conn = getDb()

  // Cek user sudah ada atau belum
  const [rows] = await conn.execute<any[]>('SELECT id, role FROM users WHERE email = ? LIMIT 1', [hrisUser.email])

  let userId: number
  let role: string

  if (rows.length === 0) {
    // Buat user baru
    const [result] = await conn.execute<any>(
      'INSERT INTO users (name, email, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
      [hrisUser.name, hrisUser.email, hash, 'customer']
    )
    userId = result.insertId
    role = 'customer'
  } else {
    // Update nama dan password
    userId = rows[0].id
    role = rows[0].role
    await conn.execute(
      'UPDATE users SET name = ?, password = ?, updated_at = NOW() WHERE id = ?',
      [hrisUser.name, hash, userId]
    )
  }

  const token = signToken({ id: userId, name: hrisUser.name, email: hrisUser.email, role })
  setAuthCookie(event, token)

  return { user: { id: userId, name: hrisUser.name, email: hrisUser.email, role } }
})

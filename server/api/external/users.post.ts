import { randomBytes } from 'crypto'
import { getDb } from '../../database/index'
import { resolveRegisteredSystemByApiKey } from '../../utils/externalAuth'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const body = await readBody(event)
  const { name, email } = body
  if (!name || !email) {
    throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap (name, email wajib)' })
  }

  const [existingRows] = await db.execute('SELECT id, name, email, role FROM users WHERE email = ? LIMIT 1', [email])
  const existing = (existingRows as any[])[0]
  if (existing) {
    return { success: true, data: existing }
  }

  const password = hashPassword(randomBytes(24).toString('hex'))

  const [result] = await db.execute<any>(
    'INSERT INTO users (name, email, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
    [name, email, password, 'customer']
  )

  return {
    success: true,
    data: { id: result.insertId, name, email, role: 'customer' },
  }
})

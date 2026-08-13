import { randomBytes } from 'node:crypto'
import { getDb } from '../../../../../database/index'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = getDb()
  const user = event.context.user
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const projectId = getRouterParam(event, 'id')
  const systemId = getRouterParam(event, 'systemId')

  const [rows] = await db.execute('SELECT id, webhook_url FROM registered_systems WHERE id = ? AND project_id = ?', [systemId, projectId])
  const system = (rows as any[])[0]
  if (!system) throw createError({ statusCode: 404, statusMessage: 'Sistem terdaftar tidak ditemukan' })
  if (!system.webhook_url) throw createError({ statusCode: 400, statusMessage: 'Sistem ini belum punya webhook_url' })

  const secret = randomBytes(24).toString('hex')
  await db.execute('UPDATE registered_systems SET webhook_secret = ?, updated_at = NOW() WHERE id = ?', [secret, systemId])

  return { success: true, data: { webhook_secret: secret } }
})

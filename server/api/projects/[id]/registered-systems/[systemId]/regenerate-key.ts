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

  const [rows] = await db.execute('SELECT id FROM registered_systems WHERE id = ? AND project_id = ?', [systemId, projectId])
  if (!(rows as any[])[0]) throw createError({ statusCode: 404, statusMessage: 'Sistem terdaftar tidak ditemukan' })

  const apiKey = randomBytes(24).toString('hex')
  await db.execute('UPDATE registered_systems SET api_key = ?, updated_at = NOW() WHERE id = ?', [apiKey, systemId])

  return { success: true, data: { api_key: apiKey } }
})

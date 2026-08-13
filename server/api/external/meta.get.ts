import { getDb } from '../../database/index'
import { resolveRegisteredSystemByApiKey } from '../../utils/externalAuth'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const [statuses] = await db.execute('SELECT id, name, color, order_index, is_resolved FROM ticket_statuses ORDER BY order_index ASC')
  const [priorities] = await db.execute('SELECT id, name, color, order_index FROM priorities ORDER BY order_index ASC')

  return { success: true, data: { statuses, priorities } }
})

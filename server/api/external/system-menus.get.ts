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

  const [menus] = await db.execute(
    `SELECT id, module, type, name, order_index FROM system_menus
     WHERE is_active = 1 AND (project_id = ? OR project_id IS NULL)
     ORDER BY order_index ASC, name ASC`,
    [system.project_id]
  )

  return { success: true, data: menus }
})

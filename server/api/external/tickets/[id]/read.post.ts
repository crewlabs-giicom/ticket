import { getDb } from '../../../../database/index'
import { resolveRegisteredSystemByApiKey, resolveUserByEmail } from '../../../../utils/externalAuth'

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

  const ticketId = Number(getRouterParam(event, 'id'))
  const [ticketRows] = await db.execute('SELECT project_id FROM tickets WHERE id = ?', [ticketId])
  const ticket = (ticketRows as any[])[0]
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })
  if (ticket.project_id !== system.project_id) throw createError({ statusCode: 403, statusMessage: 'Ticket bukan milik project ini' })

  const body = await readBody(event)
  const { viewer_email } = body
  if (!viewer_email) throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap (viewer_email wajib)' })

  const viewer = await resolveUserByEmail(db, viewer_email)
  if (!viewer) throw createError({ statusCode: 400, statusMessage: 'User viewer_email tidak ditemukan atau tidak aktif' })

  await db.execute(`
    INSERT INTO ticket_response_reads (ticket_id, user_id, last_read_response_id, last_read_at)
    SELECT ?, ?, COALESCE(MAX(id), 0), NOW() FROM ticket_responses
    WHERE ticket_id = ? AND is_internal = 0
    ON DUPLICATE KEY UPDATE
      last_read_response_id = GREATEST(last_read_response_id, VALUES(last_read_response_id)),
      last_read_at = NOW()
  `, [ticketId, viewer.id, ticketId])

  return { success: true }
})

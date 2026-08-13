import { getDb } from '../../../../database/index'
import { resolveRegisteredSystemByApiKey } from '../../../../utils/externalAuth'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const id = Number(getRouterParam(event, 'id'))

  const [ticketRows] = await db.execute(`
    SELECT t.*,
      pr.name as priority_name, pr.color as priority_color,
      s.name as status_name, s.color as status_color, s.is_resolved as status_is_resolved,
      u1.name as created_by_name, u1.email as created_by_email,
      u2.name as assigned_to_name, u2.email as assigned_to_email
    FROM tickets t
    LEFT JOIN priorities pr ON pr.id = t.priority_id
    LEFT JOIN ticket_statuses s ON s.id = t.status_id
    LEFT JOIN users u1 ON u1.id = t.created_by
    LEFT JOIN users u2 ON u2.id = t.assigned_to
    WHERE t.id = ?
  `, [id])
  const ticket = (ticketRows as any[])[0]
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })
  if (ticket.project_id !== system.project_id) throw createError({ statusCode: 403, statusMessage: 'Ticket bukan milik project ini' })

  const [responses] = await db.execute(`
    SELECT r.id, r.message, r.is_internal, r.created_at, u.name as user_name, u.email as user_email, u.role as user_role
    FROM ticket_responses r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.ticket_id = ? AND r.is_internal = 0
    ORDER BY r.created_at ASC
  `, [id])

  const [attachments] = await db.execute(`
    SELECT a.*, u.name as uploaded_by_name
    FROM ticket_attachments a
    LEFT JOIN users u ON u.id = a.uploaded_by
    WHERE a.ticket_id = ? AND a.response_id IS NULL
    ORDER BY a.created_at ASC
  `, [id])

  const responseList = responses as any[]
  let responseAttachments: any[] = []
  if (responseList.length) {
    const responseIds = responseList.map((r: any) => r.id)
    const placeholders = responseIds.map(() => '?').join(',')
    const [attRows] = await db.execute(
      `SELECT * FROM ticket_attachments WHERE response_id IN (${placeholders}) ORDER BY created_at ASC`,
      responseIds
    )
    responseAttachments = attRows as any[]
  }

  const responsesWithAttachments = responseList.map((r: any) => ({
    ...r,
    attachments: responseAttachments.filter((a: any) => a.response_id === r.id),
  }))

  return { success: true, data: { ...ticket, responses: responsesWithAttachments, attachments } }
})

import { getDb } from '../../../../database/index'
import { broadcastToAll } from '../../../../utils/sse'
import { logActivity } from '../../../../utils/activity'
import { resolveProjectByApiKey, resolveUserByEmail } from '../../../../utils/externalAuth'
import { triggerWebhook } from '../../../../utils/webhook'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const project = await resolveProjectByApiKey(db, apiKey)
  if (!project) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!project.is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const ticketId = Number(getRouterParam(event, 'id'))
  const [ticketRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [ticketId])
  const ticket = (ticketRows as any[])[0]
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })
  if (ticket.project_id !== project.id) throw createError({ statusCode: 403, statusMessage: 'Ticket bukan milik project ini' })

  const body = await readBody(event).catch(() => ({}))
  const { status_id, closed_by_email, resolution_type } = body || {}

  if (resolution_type && !['fixed', 'mismatch_requirement'].includes(resolution_type)) {
    throw createError({ statusCode: 400, statusMessage: "resolution_type harus 'fixed' atau 'mismatch_requirement'" })
  }

  let finalStatusId = status_id
  if (finalStatusId) {
    const [rows] = await db.execute('SELECT id, is_resolved FROM ticket_statuses WHERE id = ?', [finalStatusId])
    const target = (rows as any[])[0]
    if (!target || !target.is_resolved) throw createError({ statusCode: 400, statusMessage: 'status_id yang dikirim bukan status resolved/closed' })
  } else {
    const [rows] = await db.execute('SELECT id FROM ticket_statuses WHERE is_resolved = 1 ORDER BY order_index ASC LIMIT 1')
    finalStatusId = (rows as any[])[0]?.id
    if (!finalStatusId) throw createError({ statusCode: 400, statusMessage: 'Tidak ada status resolved yang tersedia' })
  }

  let closerId: number | null = null
  let closerName = 'API eksternal'
  if (closed_by_email) {
    const closer = await resolveUserByEmail(db, closed_by_email)
    if (!closer) throw createError({ statusCode: 400, statusMessage: 'User closed_by_email tidak ditemukan atau tidak aktif' })
    closerId = closer.id
    closerName = closer.name
  }

  if (!ticket.resolved_at) {
    const [msgs] = await db.execute(`
      SELECT tm.message, tm.created_at, u.name as sender_name, u.role
      FROM ticket_messages tm
      JOIN users u ON u.id = tm.sender_id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `, [ticketId])
    if ((msgs as any[]).length > 0) {
      await db.execute(
        'INSERT INTO ticket_chat_transcripts (ticket_id, transcript, message_count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE transcript=VALUES(transcript), message_count=VALUES(message_count)',
        [ticketId, JSON.stringify(msgs), (msgs as any[]).length]
      )
      await db.execute('DELETE FROM ticket_messages WHERE ticket_id = ?', [ticketId])
    }
  }

  await db.execute(
    `UPDATE tickets SET status_id = ?, resolved_at = COALESCE(resolved_at, NOW()),
     resolution_type = COALESCE(?, resolution_type), updated_at = NOW() WHERE id = ?`,
    [finalStatusId, resolution_type || null, ticketId]
  )

  await logActivity(db, {
    entity_type: 'ticket', entity_id: ticketId,
    action: 'status_changed',
    from_value: String(ticket.status_id), to_value: String(finalStatusId),
    label: `Ticket ditutup oleh ${closerName} via API eksternal`,
    user_id: closerId,
  })

  const [updatedRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [ticketId])
  const updatedTicket = (updatedRows as any[])[0]

  broadcastToAll('ticket_updated', { ticket_id: ticketId, ticket_number: ticket.ticket_number, status_id: finalStatusId })

  await triggerWebhook(db, project.id, 'ticket.closed', updatedTicket)

  return { success: true, data: updatedTicket }
})

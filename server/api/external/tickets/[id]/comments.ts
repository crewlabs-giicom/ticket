import { getDb } from '../../../../database/index'
import { broadcastToAll, broadcastToUser } from '../../../../utils/sse'
import { logActivity } from '../../../../utils/activity'
import { resolveRegisteredSystemByApiKey, resolveUserByEmail } from '../../../../utils/externalAuth'
import { triggerWebhook } from '../../../../utils/webhook'
import type { ResultSetHeader } from 'mysql2'

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
  const [ticketRows] = await db.execute('SELECT ticket_number, title, project_id, created_by, assigned_to FROM tickets WHERE id = ?', [ticketId])
  const ticket = (ticketRows as any[])[0]
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })
  if (ticket.project_id !== system.project_id) throw createError({ statusCode: 403, statusMessage: 'Ticket bukan milik project ini' })

  const body = await readBody(event)
  const { message, author_email, is_internal, attachments } = body
  if (!message || !author_email) {
    throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap (message, author_email wajib)' })
  }

  const author = await resolveUserByEmail(db, author_email)
  if (!author) throw createError({ statusCode: 400, statusMessage: 'User author_email tidak ditemukan atau tidak aktif' })

  const isInternal = is_internal ? 1 : 0

  const [r] = await db.execute(
    'INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, ?)',
    [ticketId, author.id, message, isInternal]
  )
  const responseId = (r as ResultSetHeader).insertId
  await db.execute('UPDATE tickets SET updated_at = NOW() WHERE id = ?', [ticketId])

  const attachmentRows = attachments as Array<{ filename: string; original_name: string; mime_type: string; size: number }> | undefined
  if (attachmentRows?.length) {
    for (const a of attachmentRows) {
      await db.execute(
        'INSERT INTO ticket_attachments (ticket_id, response_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ticketId, responseId, a.filename, a.original_name, a.mime_type || null, a.size || null, author.id]
      )
    }
  }

  const [respRows] = await db.execute(`
    SELECT r.*, u.name as user_name, u.role as user_role
    FROM ticket_responses r LEFT JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `, [responseId])
  const response = (respRows as any[])[0]

  if (!isInternal) {
    const notifyIds = new Set<number>()
    if (ticket.created_by !== author.id) notifyIds.add(ticket.created_by)
    if (ticket.assigned_to && ticket.assigned_to !== author.id) notifyIds.add(ticket.assigned_to)

    const [partRows] = await db.execute('SELECT user_id FROM ticket_participants WHERE ticket_id = ?', [ticketId])
    for (const p of partRows as any[]) {
      if (p.user_id !== author.id) notifyIds.add(p.user_id)
    }

    for (const uid of notifyIds) {
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [uid, 'Response baru', `${ticket.ticket_number}: ${author.name} membalas`, 'new_response', ticketId]
      )
      broadcastToUser(uid, 'notification', { title: 'Response baru', message: `${author.name} membalas ${ticket.ticket_number}`, type: 'new_response', ticket_id: ticketId })
    }
  }

  await logActivity(db, {
    entity_type: 'ticket', entity_id: ticketId,
    action: isInternal ? 'internal_note' : 'commented',
    label: `${author.name} menambahkan balasan via API eksternal`,
    user_id: author.id,
  })

  broadcastToAll('ticket_response', {
    ticket_id: ticketId,
    ticket_number: ticket.ticket_number,
    sender_id: author.id,
    sender_role: author_email,
    is_internal: !!isInternal,
    created_by: ticket.created_by,
    assigned_to: ticket.assigned_to,
  })

  await triggerWebhook(db, system.project_id, 'ticket.commented', { ticket_id: ticketId, ticket_number: ticket.ticket_number, message, author: { id: author.id, name: author.name, email: author_email } })

  return { success: true, data: response }
})

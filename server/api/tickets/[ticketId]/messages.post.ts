import { getDb } from '../../../database/index'
import { broadcastToAll } from '../../../utils/sse'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })

  const ticketId = getRouterParam(event, 'ticketId')
  const body = await readBody(event)
  const message = body?.message?.trim() || ''
  const attachments: Array<{ filename: string; original_name: string; mime_type: string; size: number }> = body?.attachments || []

  if (!message && !attachments.length) throw createError({ statusCode: 400, statusMessage: 'Pesan tidak boleh kosong' })

  const db = getDb()

  const [tickets] = await db.execute('SELECT id, ticket_number, title, created_by, assigned_to FROM tickets WHERE id = ?', [ticketId])
  const ticket = (tickets as any[])[0]
  if (!ticket) throw createError({ statusCode: 404 })
  if (user.role === 'customer' && ticket.created_by !== user.id) throw createError({ statusCode: 403 })

  const [result] = await db.execute(
    'INSERT INTO ticket_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
    [ticketId, user.id, message || null]
  )
  const insertId = (result as ResultSetHeader).insertId

  if (attachments.length) {
    for (const a of attachments) {
      await db.execute(
        'INSERT INTO ticket_message_attachments (message_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)',
        [insertId, a.filename, a.original_name, a.mime_type || null, a.size || null]
      )
    }
  }

  const [rows] = await db.execute(`
    SELECT m.id, m.ticket_id, m.sender_id, m.message, m.read_at, m.created_at,
           u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
    FROM ticket_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `, [insertId])
  const newMessage = (rows as any[])[0] as any

  if (attachments.length) {
    const [attRows] = await db.execute('SELECT * FROM ticket_message_attachments WHERE message_id = ?', [insertId])
    newMessage.attachments = attRows
  } else {
    newMessage.attachments = []
  }

  broadcastToAll('ticket_message:new', {
    ...newMessage,
    ticket_id: Number(ticketId),
    ticket_number: ticket.ticket_number,
    ticket_title: ticket.title,
    created_by: ticket.created_by,
    assigned_to: ticket.assigned_to,
  })

  return { data: newMessage }
})

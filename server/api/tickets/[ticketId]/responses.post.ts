import { getDb } from '../../../database/index'
import { broadcastToAll, broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const ticketId = getRouterParam(event, 'ticketId')

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { message, is_internal, attachments } = body
    if (!message) throw createError({ statusCode: 400, statusMessage: 'Pesan tidak boleh kosong' })

    // Customer cannot post internal notes
    const isInternal = user.role !== 'customer' && is_internal ? 1 : 0

    const r = db.prepare('INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, ?)').run(ticketId, user.id, message, isInternal)

    const ticket = db.prepare('SELECT ticket_number, title, created_by, assigned_to FROM tickets WHERE id=?').get(ticketId) as any
    db.prepare(`UPDATE tickets SET updated_at=datetime('now') WHERE id=?`).run(ticketId)

    const response = db.prepare(`
      SELECT r.*, u.name as user_name, u.role as user_role
      FROM ticket_responses r LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `).get(r.lastInsertRowid)

    // Notify relevant parties (skip if internal note)
    if (!isInternal) {
      const notifyIds = new Set<number>()
      if (ticket.created_by !== user.id) notifyIds.add(ticket.created_by)
      if (ticket.assigned_to && ticket.assigned_to !== user.id) notifyIds.add(ticket.assigned_to)

      for (const uid of notifyIds) {
        db.prepare('INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)').run(uid, 'Response baru', `${ticket.ticket_number}: ${user.name} membalas`, 'new_response', ticketId)
        broadcastToUser(uid, 'notification', { title: 'Response baru', message: `${user.name} membalas ${ticket.ticket_number}`, type: 'new_response', ticket_id: Number(ticketId) })
      }
    }

    // Save attachments if any
    if (attachments?.length) {
      const insertAtt = db.prepare('INSERT INTO ticket_attachments (ticket_id, response_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      const tx = db.transaction((items: any[]) => items.forEach((a: any) => insertAtt.run(ticketId, r.lastInsertRowid, a.filename, a.original_name, a.mime_type || null, a.size || null, user.id)))
      tx(attachments)
    }

    broadcastToAll('ticket_response', { ticket_id: Number(ticketId), ticket_number: ticket.ticket_number })

    return { success: true, data: response }
  }
})

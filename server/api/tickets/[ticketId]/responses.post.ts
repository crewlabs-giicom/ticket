import { getDb } from '../../../database/index'
import { broadcastToAll, broadcastToUser } from '../../../utils/sse'
import { logActivity } from '../../../utils/activity'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const ticketId = getRouterParam(event, 'ticketId')

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { message, is_internal, attachments, status_id } = body
    if (!message) throw createError({ statusCode: 400, statusMessage: 'Pesan tidak boleh kosong' })

    const isInternal = user.role !== 'customer' && is_internal ? 1 : 0

    const conn = await db.getConnection()
    let responseId: number
    let statusChanged = false
    try {
      await conn.beginTransaction()

      const [r] = await conn.execute(
        'INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, ?)',
        [ticketId, user.id, message, isInternal]
      )
      responseId = (r as ResultSetHeader).insertId

      // Opsional: ubah status ticket bersamaan dengan pengiriman balasan
      if (status_id && !isInternal) {
        const [statusRows] = await conn.execute(
          'SELECT id, is_resolved FROM ticket_statuses WHERE id = ?', [Number(status_id)]
        ) as any[]
        const targetStatus = (statusRows as any[])[0]
        if (targetStatus) {
          if (targetStatus.is_resolved) {
            await conn.execute(
              'UPDATE tickets SET status_id = ?, resolved_at = NOW(), updated_at = NOW() WHERE id = ?',
              [status_id, ticketId]
            )
          } else {
            await conn.execute(
              'UPDATE tickets SET status_id = ?, resolved_at = NULL, updated_at = NOW() WHERE id = ?',
              [status_id, ticketId]
            )
          }
          statusChanged = true
        }
      } else {
        await conn.execute('UPDATE tickets SET updated_at=NOW() WHERE id=?', [ticketId])
      }

      if (attachments?.length) {
        for (const a of attachments) {
          await conn.execute(
            'INSERT INTO ticket_attachments (ticket_id, response_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ticketId, responseId, a.filename, a.original_name, a.mime_type || null, a.size || null, user.id]
          )
        }
      }

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const [ticketRows] = await db.execute('SELECT ticket_number, title, created_by, assigned_to FROM tickets WHERE id=?', [ticketId])
    const ticket = (ticketRows as any[])[0]

    const [respRows] = await db.execute(`
      SELECT r.*, u.name as user_name, u.role as user_role
      FROM ticket_responses r LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `, [responseId!])
    const response = (respRows as any[])[0]

    if (!isInternal) {
      const notifyIds = new Set<number>()
      if (ticket.created_by !== user.id) notifyIds.add(ticket.created_by)
      if (ticket.assigned_to && ticket.assigned_to !== user.id) notifyIds.add(ticket.assigned_to)

      const [partRows] = await db.execute('SELECT user_id FROM ticket_participants WHERE ticket_id=?', [ticketId])
      for (const p of partRows as any[]) {
        if (p.user_id !== user.id) notifyIds.add(p.user_id)
      }

      for (const uid of notifyIds) {
        await db.execute(
          'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
          [uid, 'Response baru', `${ticket.ticket_number}: ${user.name} membalas`, 'new_response', ticketId]
        )
        broadcastToUser(uid, 'notification', { title: 'Response baru', message: `${user.name} membalas ${ticket.ticket_number}`, type: 'new_response', ticket_id: Number(ticketId) })
      }
    }

    await logActivity(db, {
      entity_type: 'ticket', entity_id: Number(ticketId), action: isInternal ? 'internal_note' : 'commented',
      label: isInternal ? `${user.name} menambahkan catatan internal` : `${user.name} menambahkan balasan`,
      user_id: user.id,
    })

    if (statusChanged) {
      await logActivity(db, {
        entity_type: 'ticket', entity_id: Number(ticketId), action: 'status_changed',
        label: `${user.name} mengubah status via balasan`,
        user_id: user.id,
      })
    }

    broadcastToAll('ticket_response', { ticket_id: Number(ticketId), ticket_number: ticket.ticket_number })

    return { success: true, data: response }
  }
})

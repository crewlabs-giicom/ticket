import { getDb } from '../../database/index'
import { broadcastToAll, broadcastToUser } from '../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [ticketRows] = await db.execute(`
      SELECT t.*,
        p.name as project_name,
        pr.name as priority_name, pr.color as priority_color,
        s.name as status_name, s.color as status_color, s.is_resolved as status_is_resolved,
        u1.name as created_by_name,
        u2.name as assigned_to_name, u2.email as assigned_to_email
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN priorities pr ON pr.id = t.priority_id
      LEFT JOIN ticket_statuses s ON s.id = t.status_id
      LEFT JOIN users u1 ON u1.id = t.created_by
      LEFT JOIN users u2 ON u2.id = t.assigned_to
      WHERE t.id = ?
    `, [id])
    const ticket = (ticketRows as any[])[0]
    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    const showInternal = user.role !== 'customer'
    const [responses] = await db.execute(`
      SELECT r.*, u.name as user_name, u.role as user_role
      FROM ticket_responses r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.ticket_id = ? ${!showInternal ? 'AND r.is_internal = 0' : ''}
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
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const [oldRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [id])
    const old = (oldRows as any[])[0]
    if (!old) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    const { title, description, project_id, priority_id, status_id, assigned_to, due_date } = body

    const dueCheck = due_date || old.due_date
    const sla_breached = dueCheck && new Date(dueCheck) < new Date() ? 1 : 0

    let resolved_at = old.resolved_at
    if (status_id && status_id !== old.status_id) {
      const [statusRows] = await db.execute('SELECT is_resolved FROM ticket_statuses WHERE id = ?', [status_id])
      const newStatus = (statusRows as any[])[0]
      if (newStatus?.is_resolved && !old.resolved_at) resolved_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }

    await db.execute(`
      UPDATE tickets SET title=?, description=?, project_id=?, priority_id=?, status_id=?,
      assigned_to=?, due_date=?, sla_breached=?, resolved_at=?, updated_at=NOW()
      WHERE id=?
    `, [
      title || old.title, description ?? old.description, project_id || old.project_id,
      priority_id || old.priority_id, status_id || old.status_id,
      assigned_to !== undefined ? assigned_to : old.assigned_to,
      due_date || old.due_date, sla_breached, resolved_at, id
    ])

    if (assigned_to && assigned_to !== old.assigned_to) {
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [assigned_to, 'Ticket di-assign ke kamu', `${old.ticket_number}: ${old.title}`, 'ticket_assigned', id]
      )
      broadcastToUser(assigned_to, 'notification', { title: 'Ticket di-assign ke kamu', message: `${old.ticket_number}: ${old.title}`, type: 'ticket_assigned', ticket_id: Number(id) })
    }

    broadcastToAll('ticket_updated', { id: Number(id), ticket_number: old.ticket_number })

    return { success: true }
  }
})

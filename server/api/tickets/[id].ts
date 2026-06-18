import { getDb } from '../../database/index'
import { broadcastToAll, broadcastToUser } from '../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const ticket = db.prepare(`
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
    `).get(id) as any

    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    const showInternal = user.role !== 'customer'
    const responses = db.prepare(`
      SELECT r.*, u.name as user_name, u.role as user_role
      FROM ticket_responses r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.ticket_id = ? ${!showInternal ? 'AND r.is_internal = 0' : ''}
      ORDER BY r.created_at ASC
    `).all(id)

    const attachments = db.prepare(`
      SELECT a.*, u.name as uploaded_by_name
      FROM ticket_attachments a
      LEFT JOIN users u ON u.id = a.uploaded_by
      WHERE a.ticket_id = ? AND a.response_id IS NULL
      ORDER BY a.created_at ASC
    `).all(id)

    // Attach response-level attachments
    const responseIds = (responses as any[]).map((r: any) => r.id)
    let responseAttachments: any[] = []
    if (responseIds.length) {
      responseAttachments = db.prepare(
        `SELECT * FROM ticket_attachments WHERE response_id IN (${responseIds.map(() => '?').join(',')}) ORDER BY created_at ASC`
      ).all(...responseIds) as any[]
    }
    const responsesWithAttachments = (responses as any[]).map((r: any) => ({
      ...r,
      attachments: responseAttachments.filter((a: any) => a.response_id === r.id),
    }))

    return { success: true, data: { ...ticket, responses: responsesWithAttachments, attachments } }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const old = db.prepare('SELECT * FROM tickets WHERE id=?').get(id) as any
    if (!old) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    const { title, description, project_id, priority_id, status_id, assigned_to, due_date } = body

    // Check SLA breach
    const dueCheck = due_date || old.due_date
    const sla_breached = dueCheck && new Date(dueCheck) < new Date() ? 1 : 0

    // Check if resolved
    let resolved_at = old.resolved_at
    let closed_at = old.closed_at
    if (status_id && status_id !== old.status_id) {
      const newStatus = db.prepare('SELECT is_resolved FROM ticket_statuses WHERE id=?').get(status_id) as any
      if (newStatus?.is_resolved && !old.resolved_at) resolved_at = new Date().toISOString()
    }

    db.prepare(`
      UPDATE tickets SET title=?, description=?, project_id=?, priority_id=?, status_id=?,
      assigned_to=?, due_date=?, sla_breached=?, resolved_at=?, updated_at=datetime('now')
      WHERE id=?
    `).run(title || old.title, description ?? old.description, project_id || old.project_id,
      priority_id || old.priority_id, status_id || old.status_id,
      assigned_to !== undefined ? assigned_to : old.assigned_to,
      due_date || old.due_date, sla_breached, resolved_at, id)

    // Notify if newly assigned
    if (assigned_to && assigned_to !== old.assigned_to) {
      db.prepare('INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)').run(assigned_to, 'Ticket di-assign ke kamu', `${old.ticket_number}: ${old.title}`, 'ticket_assigned', id)
      broadcastToUser(assigned_to, 'notification', { title: 'Ticket di-assign ke kamu', message: `${old.ticket_number}: ${old.title}`, type: 'ticket_assigned', ticket_id: Number(id) })
    }

    broadcastToAll('ticket_updated', { id: Number(id), ticket_number: old.ticket_number })

    return { success: true }
  }
})

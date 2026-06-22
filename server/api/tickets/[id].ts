import { getDb } from '../../database/index'
import { broadcastToAll, broadcastToUser } from '../../utils/sse'
import { logActivity } from '../../utils/activity'

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
        u2.name as assigned_to_name, u2.email as assigned_to_email,
        tk.title as task_title
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN priorities pr ON pr.id = t.priority_id
      LEFT JOIN ticket_statuses s ON s.id = t.status_id
      LEFT JOIN users u1 ON u1.id = t.created_by
      LEFT JOIN users u2 ON u2.id = t.assigned_to
      LEFT JOIN tasks tk ON tk.id = t.task_id
      WHERE t.id = ?
    `, [id])
    const ticket = (ticketRows as any[])[0]
    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    if (user.role === 'customer' && ticket.created_by !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    if (user.role === 'staff') {
      const [mem] = await db.execute('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', [ticket.project_id, user.id])
      if (!(mem as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const showInternal = user.role !== 'customer'
    const [responses] = await db.execute(`
      SELECT r.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar
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

    // Ticket links (recurring/duplicate references)
    const [links] = await db.execute(`
      SELECT tl.*, t_ref.ticket_number as ref_ticket_number, t_ref.title as ref_ticket_title
      FROM ticket_links tl
      LEFT JOIN tickets t_ref ON t_ref.id = tl.referenced_ticket_id
      WHERE tl.ticket_id = ?
    `, [id])

    const [backLinks] = await db.execute(`
      SELECT tl.*, t_new.ticket_number as new_ticket_number, t_new.title as new_ticket_title
      FROM ticket_links tl
      LEFT JOIN tickets t_new ON t_new.id = tl.ticket_id
      WHERE tl.referenced_ticket_id = ?
    `, [id])

    const [historyRows] = await db.execute(
      `SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.entity_type = 'ticket' AND al.entity_id = ? ORDER BY al.created_at ASC`,
      [id]
    )

    return { success: true, data: { ...ticket, responses: responsesWithAttachments, attachments, links, backLinks, history: historyRows } }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const [oldRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [id])
    const old = (oldRows as any[])[0]
    if (!old) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    if (user.role === 'customer' && old.created_by !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    if (user.role === 'staff') {
      const [mem] = await db.execute('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, user.id])
      if (!(mem as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const { title, description, project_id, status_id, assigned_to } = body
    const priority_id = user.role === 'customer' ? undefined : body.priority_id
    const due_date = body.due_date ? String(body.due_date).slice(0, 10) : body.due_date

    const dueCheck = due_date || old.due_date
    const sla_breached = dueCheck && new Date(dueCheck) < new Date() ? 1 : 0

    let resolved_at = old.resolved_at
    if (status_id && status_id !== old.status_id) {
      const [statusRows] = await db.execute('SELECT is_resolved FROM ticket_statuses WHERE id = ?', [status_id])
      const newStatus = (statusRows as any[])[0]
      if (newStatus?.is_resolved && !old.resolved_at) {
        resolved_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const [msgs] = await db.execute(`
          SELECT tm.message, tm.created_at, u.name as sender_name, u.role
          FROM ticket_messages tm
          JOIN users u ON u.id = tm.sender_id
          WHERE tm.ticket_id = ?
          ORDER BY tm.created_at ASC
        `, [id])
        if ((msgs as any[]).length > 0) {
          await db.execute(
            'INSERT INTO ticket_chat_transcripts (ticket_id, transcript, message_count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE transcript=VALUES(transcript), message_count=VALUES(message_count)',
            [id, JSON.stringify(msgs), (msgs as any[]).length]
          )
          await db.execute('DELETE FROM ticket_messages WHERE ticket_id = ?', [id])
        }
      }
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

    if (status_id && status_id !== old.status_id) {
      const [oldStatusRows] = await db.execute('SELECT name FROM ticket_statuses WHERE id = ?', [old.status_id]) as any[]
      const [newStatusRows] = await db.execute('SELECT name FROM ticket_statuses WHERE id = ?', [status_id]) as any[]
      const oldStatusName = (oldStatusRows as any[])[0]?.name ?? old.status_id
      const newStatusName = (newStatusRows as any[])[0]?.name ?? status_id
      await logActivity(db, {
        entity_type: 'ticket', entity_id: Number(id), action: 'status_changed',
        from_value: String(old.status_id), to_value: String(status_id),
        label: `${user?.name ?? 'System'} mengubah status dari "${oldStatusName}" ke "${newStatusName}"`,
        user_id: user?.id,
      })
      if (resolved_at && !old.resolved_at) {
        await logActivity(db, {
          entity_type: 'ticket', entity_id: Number(id), action: 'resolved',
          label: `Ticket diselesaikan oleh ${user?.name ?? 'System'}`,
          user_id: user?.id,
        })
      }
    }

    if (assigned_to && assigned_to !== old.assigned_to) {
      const [toUserRows] = await db.execute('SELECT name FROM users WHERE id = ?', [assigned_to]) as any[]
      const toName = (toUserRows as any[])[0]?.name ?? 'seseorang'
      await logActivity(db, {
        entity_type: 'ticket', entity_id: Number(id), action: 'assigned',
        to_value: String(assigned_to),
        label: `${user?.name ?? 'System'} menugaskan ticket ke ${toName}`,
        user_id: user?.id,
      })
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [assigned_to, 'Ticket di-assign ke kamu', `${old.ticket_number}: ${old.title}`, 'ticket_assigned', id]
      )
      broadcastToUser(assigned_to, 'notification', { title: 'Ticket di-assign ke kamu', message: `${old.ticket_number}: ${old.title}`, type: 'ticket_assigned', ticket_id: Number(id) })
    }

    if (priority_id && priority_id !== old.priority_id) {
      const [oldPriRows] = await db.execute('SELECT name FROM priorities WHERE id = ?', [old.priority_id]) as any[]
      const [newPriRows] = await db.execute('SELECT name FROM priorities WHERE id = ?', [priority_id]) as any[]
      const oldPriName = (oldPriRows as any[])[0]?.name ?? old.priority_id
      const newPriName = (newPriRows as any[])[0]?.name ?? priority_id
      await logActivity(db, {
        entity_type: 'ticket', entity_id: Number(id), action: 'priority_changed',
        from_value: String(old.priority_id), to_value: String(priority_id),
        label: `${user?.name ?? 'System'} mengubah prioritas dari "${oldPriName}" ke "${newPriName}"`,
        user_id: user?.id,
      })
    }

    broadcastToAll('ticket_updated', { id: Number(id), ticket_number: old.ticket_number })

    return { success: true }
  }
})

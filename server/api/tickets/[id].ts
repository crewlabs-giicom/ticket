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
        tk.title as task_title,
        sm.name as system_menu_name
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN priorities pr ON pr.id = t.priority_id
      LEFT JOIN ticket_statuses s ON s.id = t.status_id
      LEFT JOIN users u1 ON u1.id = t.created_by
      LEFT JOIN users u2 ON u2.id = t.assigned_to
      LEFT JOIN tasks tk ON tk.id = t.task_id
      LEFT JOIN system_menus sm ON sm.id = t.system_menu_id
      WHERE t.id = ?
    `, [id])
    const ticket = (ticketRows as any[])[0]
    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    if (user.role === 'customer' && Number(ticket.created_by) !== Number(user.id)) {
      let isParticipant = false
      try {
        const [partRows] = await db.execute('SELECT 1 FROM ticket_participants WHERE ticket_id=? AND user_id=?', [id, user.id])
        isParticipant = (partRows as any[]).length > 0
      } catch {}
      if (!isParticipant) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
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
      `SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.entity_type = 'ticket' AND al.entity_id = ? ORDER BY al.created_at DESC`,
      [id]
    )

    let participantRows: any[] = []
    try {
      const [rows] = await db.execute(`
        SELECT tp.user_id, tp.invited_by, tp.created_at,
          u.name, u.email, u.role, u.avatar,
          inv.name as invited_by_name
        FROM ticket_participants tp
        LEFT JOIN users u ON u.id = tp.user_id
        LEFT JOIN users inv ON inv.id = tp.invited_by
        WHERE tp.ticket_id = ?
        ORDER BY tp.created_at ASC
      `, [id])
      participantRows = rows as any[]
    } catch {}

    return { success: true, data: { ...ticket, responses: responsesWithAttachments, attachments, links, backLinks, history: historyRows, participants: participantRows } }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)

    // Participant actions piggyback on PUT to avoid needing a separate route
    if (body._action === 'participant_add') {
      const { user_id } = body
      const [ticketRows] = await db.execute('SELECT id, ticket_number, title FROM tickets WHERE id=?', [id])
      const ticket = (ticketRows as any[])[0]
      if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })
      try {
        await db.execute('INSERT INTO ticket_participants (ticket_id, user_id, invited_by) VALUES (?, ?, ?)', [id, user_id, user.id])
      } catch (e: any) {
        if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 409, statusMessage: 'User sudah menjadi peserta' })
        throw e
      }
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [user_id, 'Diundang ke ticket', `${user.name} mengundang Anda ke ticket ${ticket.ticket_number}: ${ticket.title}`, 'ticket_invite', id]
      )
      broadcastToUser(user_id, 'notification', { title: 'Diundang ke ticket', message: `${user.name} mengundang Anda ke ticket ${ticket.ticket_number}`, type: 'ticket_invite', ticket_id: Number(id) })
      return { success: true }
    }

    if (body._action === 'participant_remove') {
      await db.execute('DELETE FROM ticket_participants WHERE ticket_id=? AND user_id=?', [id, body.user_id])
      return { success: true }
    }

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
    const task_id = user.role !== 'customer' ? body.task_id : undefined

    // Customer hanya boleh mengubah ke status is_resolved=1, dan hanya jika ticket belum resolved
    if (user.role === 'customer' && status_id && status_id !== old.status_id) {
      const [[curStatus]] = await db.execute('SELECT is_resolved FROM ticket_statuses WHERE id=?', [old.status_id]) as any[]
      if (curStatus?.is_resolved) throw createError({ statusCode: 403, statusMessage: 'Ticket sudah selesai' })
      const [[targetStatus]] = await db.execute('SELECT is_resolved FROM ticket_statuses WHERE id=?', [status_id]) as any[]
      if (!targetStatus?.is_resolved) throw createError({ statusCode: 403, statusMessage: 'Customer hanya bisa menutup atau menyelesaikan ticket' })
    }
    const extend_reason: string | null = body.extend_reason ? String(body.extend_reason).trim() : null
    const due_date = body.due_date ? String(body.due_date).slice(0, 19).replace('T', ' ') : body.due_date

    // Recalculate due_date based on new priority's SLA hours when priority changes and no explicit due_date given
    let computedDueDate = due_date || old.due_date
    if (priority_id && priority_id !== old.priority_id && !body.due_date) {
      const [[priRow]] = await db.execute(
        'SELECT DATE_FORMAT(DATE_ADD(?, INTERVAL sla_hours HOUR), \'%Y-%m-%d %H:%i:%s\') as new_due FROM priorities WHERE id = ?',
        [old.created_at, priority_id]
      ) as any[]
      if (priRow?.new_due) computedDueDate = priRow.new_due
    }

    const dueCheck = computedDueDate
    // Use DB NOW() for SLA breach check to avoid JS UTC vs WIB mismatch
    const [[{ is_breached }]] = await db.execute(
      'SELECT CASE WHEN ? IS NOT NULL AND ? < NOW() THEN 1 ELSE 0 END AS is_breached',
      [dueCheck || null, dueCheck || null]
    ) as any[]
    const sla_breached = Number(is_breached)

    let resolved_at = old.resolved_at
    if (status_id && status_id !== old.status_id) {
      const [statusRows] = await db.execute('SELECT is_resolved FROM ticket_statuses WHERE id = ?', [status_id])
      const newStatus = (statusRows as any[])[0]
      if (newStatus?.is_resolved && !old.resolved_at) {
        // dateStrings: true → NOW() returns string directly in WIB
        const [[{ now }]] = await db.execute('SELECT NOW() as now') as any[]
        resolved_at = String(now).slice(0, 19)
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
      assigned_to=?, due_date=?, sla_breached=?, resolved_at=?, task_id=?, updated_at=NOW()
      WHERE id=?
    `, [
      title || old.title, description ?? old.description, project_id || old.project_id,
      priority_id || old.priority_id, status_id || old.status_id,
      assigned_to !== undefined ? assigned_to : old.assigned_to,
      computedDueDate, sla_breached, resolved_at,
      task_id !== undefined ? (task_id || null) : old.task_id, id
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
      if (!body.due_date && computedDueDate !== old.due_date) {
        await logActivity(db, {
          entity_type: 'ticket', entity_id: Number(id), action: 'due_date_changed',
          from_value: old.due_date ? String(old.due_date).slice(0, 19) : null,
          to_value: computedDueDate ? String(computedDueDate).slice(0, 19) : null,
          label: `Due date diperbarui otomatis ke ${computedDueDate ? String(computedDueDate).slice(0, 16) : '—'} (SLA ${newPriName})`,
          user_id: user?.id,
        })
      }
    }

    // Extend due date: activity + diskusi bubble + notifikasi
    if (extend_reason && due_date) {
      const toMs = (d: string) => new Date(d.replace(' ', 'T')).getTime()
      const diffLabel = (oldDate: string, newDate: string) => {
        const hours = Math.round((toMs(newDate) - toMs(oldDate)) / 3600000)
        if (hours < 24) return `${hours} jam`
        return `${Math.round(hours / 24)} hari`
      }
      const durasi = old.due_date ? `+${diffLabel(String(old.due_date), due_date)}` : ''
      const newDueFmt = due_date.slice(0, 16)
      const label = `${user.name} memperpanjang due date${durasi ? ` ${durasi}` : ''} → ${newDueFmt}. Alasan: ${extend_reason}`

      await logActivity(db, {
        entity_type: 'ticket', entity_id: Number(id),
        action: 'due_date_extended',
        from_value: old.due_date ? String(old.due_date).slice(0, 19) : null,
        to_value: due_date,
        label,
        user_id: user.id,
      })

      await db.execute(
        'INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal) VALUES (?, ?, ?, 1)',
        [id, user.id, label]
      )

      const notifyIds = new Set<number>()
      if (old.assigned_to && old.assigned_to !== user.id) notifyIds.add(old.assigned_to)
      if (old.created_by && old.created_by !== user.id) notifyIds.add(old.created_by)
      for (const uid of notifyIds) {
        await db.execute(
          'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
          [uid, 'Due Date Diperpanjang', label, 'ticket_extended', id]
        )
        broadcastToUser(uid, 'notification', { title: 'Due Date Diperpanjang', message: label, type: 'ticket_extended', ticket_id: Number(id) })
      }
    }

    broadcastToAll('ticket_updated', { id: Number(id), ticket_number: old.ticket_number })

    return { success: true }
  }
})

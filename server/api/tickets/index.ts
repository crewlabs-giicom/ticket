import { getDb } from '../../database/index'
import { broadcastToAll, broadcastToUser } from '../../utils/sse'
import { logActivity } from '../../utils/activity'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const query = getQuery(event)

  if (event.method === 'GET') {
    let where = '1=1'
    const params: any[] = []

    if (user.role === 'customer') {
      where += ` AND (t.created_by = ? OR t.id IN (SELECT ticket_id FROM ticket_participants WHERE user_id = ?) OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ? AND project_role = 'admin'))`
      params.push(user.id, user.id, user.id)
    } else if (user.role === 'staff') {
      where += ' AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
      params.push(user.id)
    }
    if (user.role !== 'customer' && query.assigned_to) {
      where += ' AND t.assigned_to = ?'
      params.push(query.assigned_to)
    }

    if (query.status_ids) {
      const ids = String(query.status_ids).split(',').map(Number).filter(Boolean)
      if (ids.length) { where += ` AND t.status_id IN (${ids.map(() => '?').join(',')})`; params.push(...ids) }
    } else if (query.status_id) { where += ' AND t.status_id = ?'; params.push(query.status_id) }
    if (query.priority_ids) {
      const ids = String(query.priority_ids).split(',').map(Number).filter(Boolean)
      if (ids.length) { where += ` AND t.priority_id IN (${ids.map(() => '?').join(',')})`; params.push(...ids) }
    } else if (query.priority_id) { where += ' AND t.priority_id = ?'; params.push(query.priority_id) }
    if (query.project_id) { where += ' AND t.project_id = ?'; params.push(query.project_id) }
    if (query.search) { where += ' AND (t.title LIKE ? OR t.ticket_number LIKE ?)'; params.push(`%${query.search}%`, `%${query.search}%`) }
    if (query.date_from) { where += ' AND DATE(t.created_at) >= ?'; params.push(query.date_from) }
    if (query.date_to) { where += ' AND DATE(t.created_at) <= ?'; params.push(query.date_to) }
    if (query.task_id) { where += ' AND t.task_id = ?'; params.push(query.task_id) }
    if (query.subsystem) { where += ' AND t.subsystem = ?'; params.push(query.subsystem) }
    if (query.created_by && user.role !== 'customer') { where += ' AND t.created_by = ?'; params.push(query.created_by) }
    if (query.sla_breach === '1') { where += ' AND t.sla_breached = 1' }

    const maxLimit = query.export === '1' ? 9999 : 200
    const limit = Math.min(Number(query.limit) || 50, maxLimit)
    const page = Math.max(Number(query.page) || 1, 1)
    const offset = (page - 1) * limit

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM tickets t WHERE ${where}`, params
    ) as any[]

    const [[aggStats]] = await db.execute(
      `SELECT
        COUNT(*) as total_all,
        SUM(CASE WHEN t.resolved_at IS NULL AND t.closed_at IS NULL THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN t.resolved_at IS NOT NULL OR t.closed_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN t.sla_breached = 1 THEN 1 ELSE 0 END) as breach_count,
        AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at)
                 WHEN t.closed_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.closed_at)
                 ELSE NULL END) as avg_resolution_minutes
      FROM tickets t WHERE ${where}`,
      params
    ) as any[]

    const [tickets] = await db.execute(`
      SELECT t.*,
        p.name as project_name,
        pr.name as priority_name, pr.color as priority_color,
        s.name as status_name, s.color as status_color,
        u1.name as created_by_name,
        u2.name as assigned_to_name,
        sm.name as system_menu_name,
        (SELECT COUNT(*) FROM ticket_responses r WHERE r.ticket_id = t.id AND r.is_internal = 0) as response_count,
        (SELECT COUNT(*) FROM ticket_attachments a WHERE a.ticket_id = t.id) as attachment_count
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN priorities pr ON pr.id = t.priority_id
      LEFT JOIN ticket_statuses s ON s.id = t.status_id
      LEFT JOIN users u1 ON u1.id = t.created_by
      LEFT JOIN users u2 ON u2.id = t.assigned_to
      LEFT JOIN system_menus sm ON sm.id = t.system_menu_id
      WHERE ${where}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    const mins = Number(aggStats?.avg_resolution_minutes)
    const avgSla = mins > 0
      ? (() => {
          const d = Math.floor(mins / 1440); const h = Math.floor((mins % 1440) / 60); const m = Math.floor(mins % 60)
          if (d > 0) return `${d}d ${h}h ${m}m`
          if (h > 0) return `${h}h ${m}m`
          return `${m}m`
        })()
      : null

    return {
      success: true, data: tickets, total, page, limit, totalPages: Math.ceil(total / limit),
      stats: {
        open: Number(aggStats?.open_count ?? 0),
        resolved: Number(aggStats?.resolved_count ?? 0),
        breached: Number(aggStats?.breach_count ?? 0),
        avgSla,
      }
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { title, description, project_id, priority_id, status_id, assigned_to, due_date, task_id, subsystem, system_menu_id, participants } = body

    if (!title || !project_id || !priority_id || !status_id) {
      throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap' })
    }

    const [lastRows] = await db.execute('SELECT ticket_number FROM tickets ORDER BY id DESC LIMIT 1')
    const last = (lastRows as any[])[0]
    let nextNum = 1
    if (last) {
      const match = last.ticket_number.match(/(\d+)$/)
      if (match) nextNum = parseInt(match[1]) + 1
    }
    const ticketNumber = `TKT-${String(nextNum).padStart(4, '0')}`

    let finalDueDate = due_date
    if (!finalDueDate) {
      const [priRows] = await db.execute('SELECT DATE_ADD(NOW(), INTERVAL sla_hours HOUR) as due FROM priorities WHERE id = ?', [priority_id])
      const pri = (priRows as any[])[0]
      if (pri?.due) finalDueDate = pri.due instanceof Date ? pri.due.toISOString().slice(0, 19).replace('T', ' ') : String(pri.due).slice(0, 19)
    }

    const conn = await db.getConnection()
    let ticketId: number
    try {
      await conn.beginTransaction()

      const [r] = await conn.execute(
        `INSERT INTO tickets (ticket_number, title, description, project_id, priority_id, status_id, created_by, assigned_to, due_date, task_id, subsystem, system_menu_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticketNumber, title, description || '', project_id, priority_id, status_id, user.id, assigned_to || null, finalDueDate, task_id || null, subsystem || null, system_menu_id || null]
      )
      ticketId = (r as ResultSetHeader).insertId

      const attachments = body.attachments as Array<{ filename: string; original_name: string; mime_type: string; size: number }> | undefined
      if (attachments?.length) {
        for (const a of attachments) {
          await conn.execute(
            'INSERT INTO ticket_attachments (ticket_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
            [ticketId, a.filename, a.original_name, a.mime_type || null, a.size || null, user.id]
          )
        }
      }

      // Insert participants
      const participantIds: number[] = Array.isArray(participants) ? participants.map(Number).filter(Boolean) : []
      for (const pid of participantIds) {
        if (pid === user.id) continue
        await conn.execute(
          'INSERT IGNORE INTO ticket_participants (ticket_id, user_id, invited_by) VALUES (?, ?, ?)',
          [ticketId, pid, user.id]
        )
      }

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const participantIds: number[] = Array.isArray(participants) ? participants.map(Number).filter(Boolean) : []
    const [ticketRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [ticketId!])
    const ticket = (ticketRows as any[])[0]

    // Notify participants
    for (const pid of participantIds) {
      if (pid === user.id) continue
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [pid, 'Diundang ke ticket', `${user.name} mengundang Anda ke ticket ${ticketNumber}: ${title}`, 'ticket_invite', ticketId!]
      )
      broadcastToUser(pid, 'notification', { title: 'Diundang ke ticket', message: `${user.name} mengundang Anda ke ticket ${ticketNumber}`, type: 'ticket_invite', ticket_id: ticketId! })
    }

    if (assigned_to) {
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [assigned_to, 'Ticket baru di-assign', `Ticket ${ticketNumber}: ${title}`, 'ticket_assigned', ticketId!]
      )
      broadcastToUser(assigned_to, 'notification', { title: 'Ticket baru di-assign', message: `${ticketNumber}: ${title}`, type: 'ticket_assigned', ticket_id: ticketId! })
    }

    // Insert DB notification untuk semua staff & admin aktif (kecuali creator dan assigned_to)
    const [staffAdmins] = await db.execute(
      "SELECT id FROM users WHERE role IN ('staff','admin') AND is_active = 1 AND id != ?",
      [user.id]
    )
    for (const su of staffAdmins as any[]) {
      if (su.id === assigned_to) continue
      await db.execute(
        'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
        [su.id, 'Ticket baru dibuat', `${ticketNumber}: ${title}`, 'ticket_created', ticketId!]
      )
    }

    await logActivity(db, {
      entity_type: 'ticket', entity_id: ticketId!,
      action: 'created',
      label: `Ticket dibuat oleh ${user.name}`,
      user_id: user.id,
    })

    broadcastToAll('ticket_created', { ticket_number: ticketNumber, title, id: ticketId!, created_by: user.id })

    return { success: true, data: ticket }
  }
})

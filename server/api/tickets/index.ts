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
      where += ' AND t.created_by = ?'
      params.push(user.id)
    } else if (user.role === 'staff') {
      where += ' AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
      params.push(user.id)
    } else if (query.assigned_to) {
      where += ' AND t.assigned_to = ?'
      params.push(query.assigned_to)
    }

    if (query.status_id) { where += ' AND t.status_id = ?'; params.push(query.status_id) }
    if (query.priority_id) { where += ' AND t.priority_id = ?'; params.push(query.priority_id) }
    if (query.project_id) { where += ' AND t.project_id = ?'; params.push(query.project_id) }
    if (query.search) { where += ' AND (t.title LIKE ? OR t.ticket_number LIKE ?)'; params.push(`%${query.search}%`, `%${query.search}%`) }
    if (query.date_from) { where += ' AND DATE(t.created_at) >= ?'; params.push(query.date_from) }
    if (query.date_to) { where += ' AND DATE(t.created_at) <= ?'; params.push(query.date_to) }
    if (query.task_id) { where += ' AND t.task_id = ?'; params.push(query.task_id) }
    if (query.subsystem) { where += ' AND t.subsystem = ?'; params.push(query.subsystem) }

    const limit = Math.min(Number(query.limit) || 50, 200)
    const page = Math.max(Number(query.page) || 1, 1)
    const offset = (page - 1) * limit

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM tickets t WHERE ${where}`, params
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

    return { success: true, data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { title, description, project_id, priority_id, status_id, assigned_to, due_date, task_id, subsystem, system_menu_id } = body

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
      const [priRows] = await db.execute('SELECT sla_hours FROM priorities WHERE id = ?', [priority_id])
      const pri = (priRows as any[])[0]
      if (pri) {
        const d = new Date()
        d.setHours(d.getHours() + pri.sla_hours)
        finalDueDate = d.toISOString().slice(0, 19).replace('T', ' ')
      }
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

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const [ticketRows] = await db.execute('SELECT * FROM tickets WHERE id = ?', [ticketId!])
    const ticket = (ticketRows as any[])[0]

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

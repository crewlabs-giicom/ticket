import { getDb } from '../../../../database/index'
import { requireAuth } from '../../../../utils/rbac'
import { checkQcFormCompletion } from '../../../../utils/qc'
import { broadcastToUser } from '../../../../utils/sse'
import { nextTicketNumber } from '../../../../utils/ticketNumber'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const formId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const body = await readBody(event)

  // Load item — verify it belongs to this form and to this checker
  const [[item]] = await db.execute(
    `SELECT qi.*, t.assigned_to as task_assignee, t.title as task_title, t.id as task_id, t.project_id
     FROM qc_checklist_items qi
     JOIN qc_forms qf ON qf.id = qi.qc_form_id
     JOIN tasks t ON t.id = qf.task_id
     WHERE qi.id = ? AND qi.qc_form_id = ?`,
    [itemId, formId]
  ) as any[]
  if (!item) throw createError({ statusCode: 404, message: 'Item tidak ditemukan' })

  // Only the assigned checker (or staff/admin) can check/uncheck
  if (user.role === 'customer' && item.checker_id !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Handle check action
  if ('is_checked' in body) {
    const checked = Boolean(body.is_checked)
    await db.execute(
      `UPDATE qc_checklist_items SET is_checked = ?, checked_at = ? WHERE id = ?`,
      [checked ? 1 : 0, checked ? new Date() : null, itemId]
    )
  }

  // Handle open-ticket action: create a ticket from this checklist item
  if (body.open_ticket) {
    const { priority_id, title, description, system_menu_id, attachments } = body.open_ticket
    if (!priority_id) throw createError({ statusCode: 400, message: 'priority_id required' })

    // Get the "Open" status id
    const [[openStatus]] = await db.execute(
      `SELECT id FROM ticket_statuses WHERE name = 'Open' LIMIT 1`
    ) as any[]
    if (!openStatus) throw createError({ statusCode: 500, message: 'Status Open tidak ditemukan' })

    const [[priRow]] = await db.execute(
      `SELECT DATE_ADD(NOW(), INTERVAL sla_hours HOUR) as due FROM priorities WHERE id = ?`, [priority_id]
    ) as any[]
    const dueDate = priRow?.due ? String(priRow.due).slice(0, 19) : null

    const ticketTitle = title || `[QC] ${item.item_name}`

    const conn = await db.getConnection()
    let ticketId: number
    let ticketNumber: string
    try {
      await conn.beginTransaction()

      ticketNumber = await nextTicketNumber(conn)

      const [r] = await conn.execute(
        `INSERT INTO tickets
           (ticket_number, title, description, project_id, priority_id, status_id, created_by, assigned_to, due_date, source, qc_checklist_item_id, system_menu_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'qc', ?, ?)`,
        [ticketNumber, ticketTitle, description || '', item.project_id, priority_id, openStatus.id,
         user.id, item.task_assignee || null, dueDate, itemId, system_menu_id || null]
      ) as any[]
      ticketId = (r as ResultSetHeader).insertId

      // Insert attachments if any
      if (Array.isArray(attachments) && attachments.length) {
        for (const att of attachments) {
          await conn.execute(
            `INSERT INTO ticket_attachments (ticket_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
            [ticketId, att.filename, att.original_name, att.mime_type, att.size || 0, user.id]
          )
        }
      }

      // Link to pivot table
      await conn.execute(
        `INSERT INTO qc_checklist_item_tickets (qc_checklist_item_id, ticket_id) VALUES (?, ?)`,
        [itemId, ticketId]
      )

      // Auto-check the item
      await conn.execute(
        `UPDATE qc_checklist_items SET is_checked = 1, checked_at = NOW() WHERE id = ?`, [itemId]
      )

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    // Notify task assignee
    if (item.task_assignee && item.task_assignee !== user.id) {
      await db.execute(
        `INSERT INTO notifications (user_id, title, message, type, ticket_id, task_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [item.task_assignee, 'Ticket QC dibuka', `${user.name} membuka ticket QC: ${ticketTitle}`, 'qc_ticket_opened', ticketId, item.task_id]
      )
      broadcastToUser(Number(item.task_assignee), 'notification', {
        title: 'Ticket QC dibuka',
        message: `${user.name}: ${ticketTitle}`,
        type: 'qc_ticket_opened',
        ticket_id: ticketId,
        task_id: item.task_id,
      })
    }

    const [[ticket]] = await db.execute(
      `SELECT t.*, ts.name as status_name, ts.color as status_color FROM tickets t JOIN ticket_statuses ts ON ts.id = t.status_id WHERE t.id = ?`,
      [ticketId]
    ) as any[]
    return { ticket }
  }

  const [[updated]] = await db.execute(`SELECT * FROM qc_checklist_items WHERE id = ?`, [itemId]) as any[]
  return updated
})

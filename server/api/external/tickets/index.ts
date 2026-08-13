import { getDb } from '../../../database/index'
import { broadcastToAll, broadcastToUser } from '../../../utils/sse'
import { logActivity } from '../../../utils/activity'
import { nextTicketNumber } from '../../../utils/ticketNumber'
import { resolveRegisteredSystemByApiKey, resolveUserByEmail } from '../../../utils/externalAuth'
import { triggerWebhook } from '../../../utils/webhook'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const body = await readBody(event)
  const {
    title, description, priority_id, status_id, assigned_to, due_date,
    task_id, subsystem, system_menu_id, participants, attachments, created_by_email,
  } = body

  if (!title || !created_by_email) {
    throw createError({ statusCode: 400, statusMessage: 'Field tidak lengkap (title, created_by_email wajib)' })
  }

  const creator = await resolveUserByEmail(db, created_by_email)
  if (!creator) throw createError({ statusCode: 400, statusMessage: 'User created_by_email tidak ditemukan atau tidak aktif' })

  let finalPriorityId = priority_id
  if (!finalPriorityId) {
    const [rows] = await db.execute('SELECT id FROM priorities ORDER BY order_index ASC LIMIT 1')
    finalPriorityId = (rows as any[])[0]?.id
    if (!finalPriorityId) throw createError({ statusCode: 400, statusMessage: 'Tidak ada priority yang tersedia' })
  }

  let finalStatusId = status_id
  if (!finalStatusId) {
    const [rows] = await db.execute('SELECT id FROM ticket_statuses ORDER BY order_index ASC LIMIT 1')
    finalStatusId = (rows as any[])[0]?.id
    if (!finalStatusId) throw createError({ statusCode: 400, statusMessage: 'Tidak ada status yang tersedia' })
  }

  let finalDueDate = due_date
  if (!finalDueDate) {
    const [priRows] = await db.execute('SELECT DATE_ADD(NOW(), INTERVAL sla_hours HOUR) as due FROM priorities WHERE id = ?', [finalPriorityId])
    const pri = (priRows as any[])[0]
    if (pri?.due) finalDueDate = pri.due instanceof Date ? pri.due.toISOString().slice(0, 19).replace('T', ' ') : String(pri.due).slice(0, 19)
  }

  const conn = await db.getConnection()
  let ticketId: number
  let ticketNumber: string
  try {
    await conn.beginTransaction()

    ticketNumber = await nextTicketNumber(conn)

    const [r] = await conn.execute(
      `INSERT INTO tickets (ticket_number, title, description, project_id, priority_id, status_id, created_by, assigned_to, due_date, task_id, subsystem, system_menu_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticketNumber, title, description || '', system.project_id, finalPriorityId, finalStatusId, creator.id, assigned_to || null, finalDueDate, task_id || null, subsystem || null, system_menu_id || null]
    )
    ticketId = (r as ResultSetHeader).insertId

    const attachmentRows = attachments as Array<{ filename: string; original_name: string; mime_type: string; size: number }> | undefined
    if (attachmentRows?.length) {
      for (const a of attachmentRows) {
        await conn.execute(
          'INSERT INTO ticket_attachments (ticket_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
          [ticketId, a.filename, a.original_name, a.mime_type || null, a.size || null, creator.id]
        )
      }
    }

    const participantIds: number[] = Array.isArray(participants) ? participants.map(Number).filter(Boolean) : []
    for (const pid of participantIds) {
      if (pid === creator.id) continue
      await conn.execute(
        'INSERT IGNORE INTO ticket_participants (ticket_id, user_id, invited_by) VALUES (?, ?, ?)',
        [ticketId, pid, creator.id]
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

  for (const pid of participantIds) {
    if (pid === creator.id) continue
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
      [pid, 'Diundang ke ticket', `${creator.name} mengundang Anda ke ticket ${ticketNumber}: ${title}`, 'ticket_invite', ticketId!]
    )
    broadcastToUser(pid, 'notification', { title: 'Diundang ke ticket', message: `${creator.name} mengundang Anda ke ticket ${ticketNumber}`, type: 'ticket_invite', ticket_id: ticketId! })
  }

  if (assigned_to) {
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
      [assigned_to, 'Ticket baru di-assign', `Ticket ${ticketNumber}: ${title}`, 'ticket_assigned', ticketId!]
    )
    broadcastToUser(assigned_to, 'notification', { title: 'Ticket baru di-assign', message: `${ticketNumber}: ${title}`, type: 'ticket_assigned', ticket_id: ticketId! })
  }

  const [staffAdmins] = await db.execute(
    "SELECT id FROM users WHERE role IN ('staff','admin') AND is_active = 1 AND id != ?",
    [creator.id]
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
    label: `Ticket dibuat oleh ${creator.name} via API eksternal`,
    user_id: creator.id,
  })

  broadcastToAll('ticket_created', { ticket_number: ticketNumber, title, id: ticketId!, created_by: creator.id })

  await triggerWebhook(db, system.project_id, 'ticket.created', ticket)

  return { success: true, data: ticket }
})

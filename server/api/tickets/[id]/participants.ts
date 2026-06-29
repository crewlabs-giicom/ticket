import { getDb } from '../../../database/index'
import { isProjectAdmin } from '../../../utils/rbac'
import { broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
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
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    if (user.role === 'customer') {
      const [ticketInfo] = await db.execute('SELECT project_id FROM tickets WHERE id=?', [id]) as any[]
      const projectId = (ticketInfo as any[])[0]?.project_id
      if (!projectId || !(await isProjectAdmin(db, user.id, projectId))) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })

    const [ticketRows] = await db.execute('SELECT id, ticket_number, title FROM tickets WHERE id=?', [id])
    const ticket = (ticketRows as any[])[0]
    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket tidak ditemukan' })

    try {
      await db.execute(
        'INSERT INTO ticket_participants (ticket_id, user_id, invited_by) VALUES (?, ?, ?)',
        [id, user_id, user.id]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 409, statusMessage: 'User sudah menjadi peserta' })
      throw e
    }

    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, 'Diundang ke ticket', `${user.name} mengundang Anda ke ticket ${ticket.ticket_number}: ${ticket.title}`, 'ticket_invite', id]
    )
    broadcastToUser(user_id, 'notification', {
      title: 'Diundang ke ticket',
      message: `${user.name} mengundang Anda ke ticket ${ticket.ticket_number}`,
      type: 'ticket_invite',
      ticket_id: Number(id),
    })

    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role === 'customer') {
      const [ticketInfo] = await db.execute('SELECT project_id FROM tickets WHERE id=?', [id]) as any[]
      const projectId = (ticketInfo as any[])[0]?.project_id
      if (!projectId || !(await isProjectAdmin(db, user.id, projectId))) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })

    await db.execute('DELETE FROM ticket_participants WHERE ticket_id=? AND user_id=?', [id, user_id])
    return { success: true }
  }
})

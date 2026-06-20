import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })

  const ticketId = getRouterParam(event, 'ticketId')
  const db = getDb()

  const [tickets] = await db.execute('SELECT id, created_by FROM tickets WHERE id = ?', [ticketId])
  const ticket = (tickets as any[])[0]
  if (!ticket) throw createError({ statusCode: 404 })
  if (user.role === 'customer' && ticket.created_by !== user.id) throw createError({ statusCode: 403 })

  const [messages] = await db.execute(`
    SELECT m.id, m.ticket_id, m.sender_id, m.message, m.read_at, m.created_at,
           u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
    FROM ticket_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.ticket_id = ?
    ORDER BY m.created_at ASC
  `, [ticketId])

  const msgList = messages as any[]

  if (msgList.length) {
    const ids = msgList.map(m => m.id)
    const placeholders = ids.map(() => '?').join(',')
    const [attRows] = await db.execute(
      `SELECT * FROM ticket_message_attachments WHERE message_id IN (${placeholders}) ORDER BY id ASC`,
      ids
    )
    const attMap: Record<number, any[]> = {}
    for (const a of attRows as any[]) {
      if (!attMap[a.message_id]) attMap[a.message_id] = []
      attMap[a.message_id].push(a)
    }
    for (const msg of msgList) {
      msg.attachments = attMap[msg.id] || []
    }
  }

  return { data: msgList }
})

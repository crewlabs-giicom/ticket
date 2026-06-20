import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })

  const db = getDb()
  const [rows] = await db.execute(`
    SELECT DISTINCT t.id as ticketId, t.ticket_number as ticketNumber, t.title
    FROM tickets t
    INNER JOIN ticket_messages tm ON tm.ticket_id = t.id
    WHERE (t.created_by = ? OR t.assigned_to = ?)
    ORDER BY t.id DESC
  `, [user.id, user.id])

  return { data: rows }
})

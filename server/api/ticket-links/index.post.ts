import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const body = await readBody(event)
  const { ticket_id, referenced_ticket_id, relation_type = 'recurring', note } = body

  if (!ticket_id || !referenced_ticket_id) {
    throw createError({ statusCode: 400, message: 'ticket_id and referenced_ticket_id required' })
  }

  const [result] = await db.execute(
    `INSERT INTO ticket_links (ticket_id, referenced_ticket_id, relation_type, note) VALUES (?, ?, ?, ?)`,
    [ticket_id, referenced_ticket_id, relation_type, note || null]
  ) as any[]

  const [rows] = await db.execute('SELECT * FROM ticket_links WHERE id = ?', [result.insertId])
  return (rows as any[])[0]
})

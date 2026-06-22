import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [rows] = await db.execute(
      'SELECT ticket_id, ticket_number, title FROM user_pinned_tabs WHERE user_id = ? ORDER BY created_at ASC',
      [user.id]
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { ticket_id, ticket_number, title } = body
    if (!ticket_id) throw createError({ statusCode: 400, statusMessage: 'ticket_id required' })
    await db.execute(
      'INSERT INTO user_pinned_tabs (user_id, ticket_id, ticket_number, title) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE ticket_number=VALUES(ticket_number), title=VALUES(title)',
      [user.id, ticket_id, ticket_number || '', title || '']
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    const body = await readBody(event)
    const { ticket_id } = body
    if (!ticket_id) throw createError({ statusCode: 400, statusMessage: 'ticket_id required' })
    await db.execute(
      'DELETE FROM user_pinned_tabs WHERE user_id = ? AND ticket_id = ?',
      [user.id, ticket_id]
    )
    return { success: true }
  }
})

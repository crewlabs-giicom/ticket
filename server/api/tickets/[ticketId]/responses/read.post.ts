import { getDb } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const ticketId = getRouterParam(event, 'ticketId')

  await db.execute(`
    INSERT INTO ticket_response_reads (ticket_id, user_id, last_read_response_id, last_read_at)
    SELECT ?, ?, COALESCE(MAX(id), 0), NOW() FROM ticket_responses
    WHERE ticket_id = ? AND (is_internal = 0 OR ? IN ('staff','admin'))
    ON DUPLICATE KEY UPDATE
      last_read_response_id = GREATEST(last_read_response_id, VALUES(last_read_response_id)),
      last_read_at = NOW()
  `, [ticketId, user.id, ticketId, user.role])

  return { success: true }
})

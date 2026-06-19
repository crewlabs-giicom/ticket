import { getDb } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })

  const ticketId = getRouterParam(event, 'ticketId')
  const db = getDb()

  await db.execute(
    'UPDATE ticket_messages SET read_at = NOW() WHERE ticket_id = ? AND sender_id != ? AND read_at IS NULL',
    [ticketId, user.id]
  )

  return { ok: true }
})

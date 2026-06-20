import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const ticketId = getRouterParam(event, 'ticketId')

  const [rows] = await db.execute(
    'SELECT transcript, message_count, created_at FROM ticket_chat_transcripts WHERE ticket_id = ?',
    [ticketId]
  )
  const row = (rows as any[])[0]
  if (!row) return { success: true, data: null }

  return {
    success: true,
    data: {
      transcript: typeof row.transcript === 'string' ? JSON.parse(row.transcript) : row.transcript,
      message_count: row.message_count,
      created_at: row.created_at,
    },
  }
})

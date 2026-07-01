import type { PoolConnection } from 'mysql2/promise'

/**
 * Generates the next sequential ticket number safely under concurrency.
 * Uses a MySQL named lock so two connections can't compute the same
 * "last ticket + 1" value at once (SELECT MAX + INSERT is otherwise a race).
 * Must be called with a connection that is inside a transaction.
 */
export async function nextTicketNumber(conn: PoolConnection): Promise<string> {
  await conn.query(`SELECT GET_LOCK('ticket_number_gen', 10)`)
  try {
    const [[last]] = await conn.execute(
      'SELECT ticket_number FROM tickets ORDER BY id DESC LIMIT 1'
    ) as any[]
    let nextNum = 1
    if (last) {
      const match = last.ticket_number.match(/(\d+)$/)
      if (match) nextNum = parseInt(match[1]) + 1
    }
    return `TKT-${String(nextNum).padStart(4, '0')}`
  } finally {
    await conn.query(`SELECT RELEASE_LOCK('ticket_number_gen')`)
  }
}

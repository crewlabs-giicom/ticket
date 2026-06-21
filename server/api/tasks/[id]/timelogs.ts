import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const taskId = Number(event.context.params?.id)

  if (event.method === 'GET') {
    const [logs] = await db.execute(
      `SELECT tl.*, u.name as user_name
       FROM task_timelogs tl
       LEFT JOIN users u ON u.id = tl.user_id
       WHERE tl.task_id = ?
       ORDER BY tl.started_at DESC`,
      [taskId]
    )
    const [[{ total_seconds }]] = await db.execute(
      `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds FROM task_timelogs WHERE task_id = ? AND stopped_at IS NOT NULL`,
      [taskId]
    ) as any[]
    const [[activeLog]] = await db.execute(
      `SELECT tl.*, u.name as user_name FROM task_timelogs tl LEFT JOIN users u ON u.id = tl.user_id WHERE tl.task_id = ? AND tl.user_id = ? AND tl.stopped_at IS NULL LIMIT 1`,
      [taskId, user.id]
    ) as any[]
    return { data: logs, total_seconds, active_log: activeLog || null }
  }

  if (event.method === 'POST') {
    // Stop ALL active timers for this user (globally — one active timer at a time)
    await db.execute(
      `UPDATE task_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE user_id = ? AND stopped_at IS NULL`,
      [user.id]
    )
    // Start new timer
    const [r] = await db.execute(
      `INSERT INTO task_timelogs (task_id, user_id, started_at) VALUES (?, ?, NOW())`,
      [taskId, user.id]
    ) as any[]
    const [rows] = await db.execute('SELECT * FROM task_timelogs WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    // Stop timer
    const logId = Number(getQuery(event).log_id)
    if (!logId) throw createError({ statusCode: 400, message: 'log_id required' })
    await db.execute(
      `UPDATE task_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE id = ? AND user_id = ?`,
      [logId, user.id]
    )
    const [rows] = await db.execute('SELECT * FROM task_timelogs WHERE id = ?', [logId])
    return { data: (rows as any[])[0] }
  }
})

import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const formId = Number(getRouterParam(event, 'id'))

  // Permission: only checkers of this form (+ staff/admin) can access timelogs
  if (user.role === 'customer') {
    const [[isMember]] = await db.execute(
      `SELECT 1 FROM qc_form_checkers WHERE qc_form_id = ? AND user_id = ?`, [formId, user.id]
    ) as any[]
    if (!isMember) throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (event.method === 'GET') {
    const [logs] = await db.execute(
      `SELECT tl.*, u.name as user_name
       FROM qc_timelogs tl
       LEFT JOIN users u ON u.id = tl.user_id
       WHERE tl.qc_form_id = ?
       ORDER BY tl.started_at DESC`,
      [formId]
    )
    const [[{ total_seconds }]] = await db.execute(
      `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds FROM qc_timelogs WHERE qc_form_id = ? AND stopped_at IS NOT NULL`,
      [formId]
    ) as any[]
    const [[activeLog]] = await db.execute(
      `SELECT tl.*, u.name as user_name, qf.sequence as form_sequence, t.title as task_title
       FROM qc_timelogs tl
       LEFT JOIN users u ON u.id = tl.user_id
       LEFT JOIN qc_forms qf ON qf.id = tl.qc_form_id
       LEFT JOIN tasks t ON t.id = qf.task_id
       WHERE tl.qc_form_id = ? AND tl.user_id = ? AND tl.stopped_at IS NULL LIMIT 1`,
      [formId, user.id]
    ) as any[]
    return { data: logs, total_seconds, active_log: activeLog || null }
  }

  if (event.method === 'POST') {
    // Stop ALL active timers for this user globally (task + ticket + qc)
    await db.execute(
      `UPDATE task_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE user_id = ? AND stopped_at IS NULL`,
      [user.id]
    )
    await db.execute(
      `UPDATE ticket_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE user_id = ? AND stopped_at IS NULL`,
      [user.id]
    ).catch(() => {})
    await db.execute(
      `UPDATE qc_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE user_id = ? AND stopped_at IS NULL`,
      [user.id]
    )
    // Start new QC timer
    const [r] = await db.execute(
      `INSERT INTO qc_timelogs (qc_form_id, user_id, started_at) VALUES (?, ?, NOW())`,
      [formId, user.id]
    ) as any[]
    const [rows] = await db.execute('SELECT * FROM qc_timelogs WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { data: (rows as any[])[0] }
  }

  if (event.method === 'PUT') {
    const logId = Number(getQuery(event).log_id)
    if (!logId) throw createError({ statusCode: 400, message: 'log_id required' })
    await db.execute(
      `UPDATE qc_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE id = ? AND user_id = ?`,
      [logId, user.id]
    )
    const [rows] = await db.execute('SELECT * FROM qc_timelogs WHERE id = ?', [logId])
    return { data: (rows as any[])[0] }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

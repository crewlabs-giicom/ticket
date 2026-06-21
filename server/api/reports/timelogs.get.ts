import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const q = getQuery(event)

  // Default date range: last 30 days
  const dateTo = String(q.date_to || q.to || new Date().toISOString().slice(0, 10))
  const dateFrom = String(q.date_from || q.from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
  const dateFromFull = `${dateFrom} 00:00:00`
  const dateToFull = `${dateTo} 23:59:59`

  // Sort mapping for timelog detail table
  const sortMap: Record<string, string> = {
    start_asc: 'tl.started_at ASC',
    start_desc: 'tl.started_at DESC',
    end_asc: 'tl.stopped_at ASC',
    end_desc: 'tl.stopped_at DESC',
    duration_desc: 'tl.duration_seconds DESC',
    duration_asc: 'tl.duration_seconds ASC',
  }
  const sortSql = sortMap[String(q.sort || '')] || 'tl.started_at DESC'

  // Build timelog conditions
  const tlConditions: string[] = [
    'tl.stopped_at IS NOT NULL',
    'tl.started_at BETWEEN ? AND ?',
  ]
  const tlParams: any[] = [dateFromFull, dateToFull]

  if (q.project_id) {
    tlConditions.push('t.project_id = ?')
    tlParams.push(Number(q.project_id))
  }
  if (q.user_id) {
    tlConditions.push('tl.user_id = ?')
    tlParams.push(Number(q.user_id))
  }

  const tlWhere = `WHERE ${tlConditions.join(' AND ')}`

  // 1. Timelog detail — sortable
  const [logs] = await db.execute(`
    SELECT tl.id, tl.task_id, tl.user_id, tl.started_at, tl.stopped_at, tl.duration_seconds,
      t.title as task_title, t.status as task_status, t.completed_at,
      p.id as project_id, p.name as project_name,
      u.name as user_name
    FROM task_timelogs tl
    JOIN tasks t ON t.id = tl.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN users u ON u.id = tl.user_id
    ${tlWhere}
    ORDER BY ${sortSql}
    LIMIT 200
  `, tlParams)

  // 2. Per-project summary
  const [byProject] = await db.execute(`
    SELECT p.id as project_id, p.name as project_name,
      SUM(tl.duration_seconds) as total_seconds,
      COUNT(DISTINCT tl.task_id) as tasks_tracked,
      COUNT(DISTINCT tl.user_id) as users_tracked
    FROM task_timelogs tl
    JOIN tasks t ON t.id = tl.task_id
    JOIN projects p ON p.id = t.project_id
    ${tlWhere}
    GROUP BY p.id, p.name
    ORDER BY total_seconds DESC
  `, tlParams)

  // 3. Staff activity summary — task seconds + ticket count in range
  const staffBaseParams: any[] = [dateFromFull, dateToFull]
  const staffTicketParams: any[] = [dateFromFull, dateToFull]
  if (q.project_id) {
    staffBaseParams.push(Number(q.project_id))
    staffTicketParams.push(Number(q.project_id))
  }

  const [staffSummary] = await db.execute(`
    SELECT u.id, u.name,
      COALESCE(SUM(tl.duration_seconds), 0) as task_seconds,
      COUNT(DISTINCT tl.task_id) as tasks_worked,
      COUNT(DISTINCT tl.id) as timelog_count
    FROM users u
    LEFT JOIN task_timelogs tl ON tl.user_id = u.id
      AND tl.stopped_at IS NOT NULL
      AND tl.started_at BETWEEN ? AND ?
      ${q.project_id ? 'AND EXISTS (SELECT 1 FROM tasks t2 WHERE t2.id = tl.task_id AND t2.project_id = ?)' : ''}
    WHERE u.role != 'customer'
    GROUP BY u.id, u.name
    ORDER BY task_seconds DESC
  `, staffBaseParams)

  // Ticket handled per staff (responded_by or assigned_to, resolved/closed in range)
  const [staffTickets] = await db.execute(`
    SELECT tk.assigned_to as user_id,
      COUNT(*) as tickets_handled,
      COALESCE(SUM(TIMESTAMPDIFF(SECOND, tk.created_at, COALESCE(tk.resolved_at, tk.closed_at))), 0) as ticket_lifecycle_seconds
    FROM tickets tk
    WHERE (tk.resolved_at BETWEEN ? AND ? OR tk.closed_at BETWEEN ? AND ?)
      AND tk.assigned_to IS NOT NULL
      ${q.project_id ? 'AND tk.project_id = ?' : ''}
    GROUP BY tk.assigned_to
  `, q.project_id ? [dateFromFull, dateToFull, dateFromFull, dateToFull, Number(q.project_id)] : [dateFromFull, dateToFull, dateFromFull, dateToFull])

  // Merge ticket data into staffSummary
  const ticketMap = new Map((staffTickets as any[]).map((r: any) => [r.user_id, r]))
  const staffWithComposition = (staffSummary as any[]).map((s: any) => {
    const t = ticketMap.get(s.id) || { tickets_handled: 0, ticket_lifecycle_seconds: 0 }
    const taskSec = Number(s.task_seconds) || 0
    const ticketSec = Number(t.ticket_lifecycle_seconds) || 0
    const total = taskSec + ticketSec
    return {
      ...s,
      tickets_handled: t.tickets_handled,
      ticket_lifecycle_seconds: ticketSec,
      task_pct: total > 0 ? Math.round(taskSec / total * 100) : 0,
      ticket_pct: total > 0 ? Math.round(ticketSec / total * 100) : 0,
    }
  })

  // 4. Ticket lifecycle SLA (resolved/closed in date range)
  const ticketConditions = [
    '(tk.resolved_at BETWEEN ? AND ? OR tk.closed_at BETWEEN ? AND ?)',
  ]
  const ticketParams: any[] = [dateFromFull, dateToFull, dateFromFull, dateToFull]
  if (q.project_id) {
    ticketConditions.push('tk.project_id = ?')
    ticketParams.push(Number(q.project_id))
  }
  if (q.user_id) {
    ticketConditions.push('tk.assigned_to = ?')
    ticketParams.push(Number(q.user_id))
  }

  const [ticketLifecycle] = await db.execute(`
    SELECT tk.id, tk.ticket_number, tk.title,
      p.name as project_name,
      u.name as assigned_to_name,
      tk.created_at,
      COALESCE(tk.resolved_at, tk.closed_at) as ended_at,
      TIMESTAMPDIFF(SECOND, tk.created_at, COALESCE(tk.resolved_at, tk.closed_at)) as lifecycle_seconds
    FROM tickets tk
    JOIN projects p ON p.id = tk.project_id
    LEFT JOIN users u ON u.id = tk.assigned_to
    WHERE ${ticketConditions.join(' AND ')}
    ORDER BY lifecycle_seconds DESC
    LIMIT 100
  `, ticketParams)

  // 5. Per-user legacy format (kept for backward compat with old UI)
  const [byUser] = await db.execute(`
    SELECT u.id as user_id, u.name as user_name,
      p.id as project_id, p.name as project_name,
      SUM(tl.duration_seconds) as total_seconds,
      COUNT(DISTINCT tl.task_id) as tasks_tracked
    FROM task_timelogs tl
    JOIN tasks t ON t.id = tl.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN users u ON u.id = tl.user_id
    ${tlWhere}
    GROUP BY u.id, u.name, p.id, p.name
    ORDER BY p.id, total_seconds DESC
  `, tlParams)

  // 6. Staff per project — task + ticket breakdown per user per project
  const [taskPerStaffProject] = await db.execute(`
    SELECT u.id as user_id, u.name as user_name,
      p.id as project_id, p.name as project_name,
      COALESCE(SUM(tl.duration_seconds), 0) as task_seconds,
      COUNT(DISTINCT tl.task_id) as task_count
    FROM task_timelogs tl
    JOIN tasks t ON t.id = tl.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN users u ON u.id = tl.user_id
    ${tlWhere}
    GROUP BY u.id, u.name, p.id, p.name
    ORDER BY u.id, task_seconds DESC
  `, tlParams)

  const ticketPerStaffProjectParams: any[] = [dateFromFull, dateToFull, dateFromFull, dateToFull]
  const ticketPerStaffProjectConditions: string[] = []
  if (q.project_id) { ticketPerStaffProjectConditions.push('tk.project_id = ?'); ticketPerStaffProjectParams.push(Number(q.project_id)) }
  if (q.user_id) { ticketPerStaffProjectConditions.push('tk.assigned_to = ?'); ticketPerStaffProjectParams.push(Number(q.user_id)) }

  const [ticketPerStaffProject] = await db.execute(`
    SELECT tk.assigned_to as user_id, tk.project_id,
      COUNT(*) as ticket_count,
      COALESCE(SUM(TIMESTAMPDIFF(SECOND, tk.created_at, COALESCE(tk.resolved_at, tk.closed_at))), 0) as ticket_lifecycle_seconds
    FROM tickets tk
    WHERE (tk.resolved_at BETWEEN ? AND ? OR tk.closed_at BETWEEN ? AND ?)
      AND tk.assigned_to IS NOT NULL
      ${ticketPerStaffProjectConditions.length ? 'AND ' + ticketPerStaffProjectConditions.join(' AND ') : ''}
    GROUP BY tk.assigned_to, tk.project_id
  `, ticketPerStaffProjectParams)

  const ticketProjMap = new Map((ticketPerStaffProject as any[]).map((r: any) => [`${r.user_id}:${r.project_id}`, r]))

  const staffPerProject = (taskPerStaffProject as any[]).map((r: any) => {
    const tk = ticketProjMap.get(`${r.user_id}:${r.project_id}`) || { ticket_count: 0, ticket_lifecycle_seconds: 0 }
    const taskSec = Number(r.task_seconds) || 0
    const ticketSec = Number(tk.ticket_lifecycle_seconds) || 0
    const total = taskSec + ticketSec
    return {
      ...r,
      ticket_count: tk.ticket_count || 0,
      ticket_lifecycle_seconds: ticketSec,
      task_pct: total > 0 ? Math.round(taskSec / total * 100) : 100,
      ticket_pct: total > 0 ? Math.round(ticketSec / total * 100) : 0,
    }
  })

  return {
    logs,
    by_project: byProject,
    by_user: byUser,
    staff_summary: staffWithComposition,
    staff_per_project: staffPerProject,
    ticket_lifecycle: ticketLifecycle,
    meta: { date_from: dateFrom, date_to: dateTo },
  }
})

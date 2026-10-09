import type mysql from 'mysql2/promise'

export interface DailyReportOptions {
  /** Filter ke satu user (null = semua) */
  userId?: number | null
  /** Batasi tiket ke project milik user ini (dipakai untuk role staff) */
  projectScopeUserId?: number | null
}

export async function buildDailyReport(db: mysql.Pool, date: string, opts: DailyReportOptions = {}) {
  const effectiveUserId = opts.userId || null

  // Task timelogs for the day
  const timelogParams: any[] = [date]
  let timelogWhere = 'DATE(tl.started_at) = ? AND tl.stopped_at IS NOT NULL'
  if (effectiveUserId) { timelogWhere += ' AND tl.user_id = ?'; timelogParams.push(effectiveUserId) }

  const [timelogs] = await db.execute(
    `SELECT tl.id, tl.task_id, tl.user_id, tl.started_at, tl.stopped_at, tl.duration_seconds, tl.note,
            t.title as task_title, t.status as task_status,
            p.name as project_name, u.name as user_name
     FROM task_timelogs tl
     LEFT JOIN tasks t ON t.id = tl.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = tl.user_id
     WHERE ${timelogWhere}
     ORDER BY tl.started_at ASC`,
    timelogParams
  ) as any[]

  // Tickets handled today — unique per ticket
  // Sources: ticket_responses, ticket_messages, or resolved today (filtered per user if set)
  const taParams: any[] = []

  let respSub = 'SELECT ticket_id FROM ticket_responses WHERE DATE(created_at) = ?'
  taParams.push(date)
  if (effectiveUserId) { respSub += ' AND user_id = ?'; taParams.push(effectiveUserId) }

  let chatSub = 'SELECT ticket_id FROM ticket_messages WHERE DATE(created_at) = ?'
  taParams.push(date)
  if (effectiveUserId) { chatSub += ' AND sender_id = ?'; taParams.push(effectiveUserId) }

  let resolvedSub = 'SELECT id FROM tickets WHERE DATE(resolved_at) = ?'
  taParams.push(date)
  if (effectiveUserId) { resolvedSub += ' AND assigned_to = ?'; taParams.push(effectiveUserId) }

  let staffProjectFilter = ''
  if (opts.projectScopeUserId) {
    staffProjectFilter = ' AND tk.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
    taParams.push(opts.projectScopeUserId)
  }

  const [ticketActivities] = await db.execute(
    `SELECT tk.id as ticket_id, tk.ticket_number, tk.title as ticket_title,
            tk.resolved_at, p.name as project_name, u.name as user_name
     FROM tickets tk
     LEFT JOIN projects p ON p.id = tk.project_id
     LEFT JOIN users u ON u.id = tk.assigned_to
     WHERE tk.id IN (
       ${respSub}
       UNION
       ${chatSub}
       UNION
       ${resolvedSub}
     )${staffProjectFilter}
     ORDER BY tk.resolved_at IS NULL ASC, tk.resolved_at DESC, tk.id DESC`,
    taParams
  ) as any[]

  // Ticket timelogs for the day
  const ttParams: any[] = [date]
  let ttWhere = 'DATE(tl.started_at) = ? AND tl.stopped_at IS NOT NULL'
  if (effectiveUserId) { ttWhere += ' AND tl.user_id = ?'; ttParams.push(effectiveUserId) }

  const [ticketTimelogs] = await db.execute(
    `SELECT tl.id, tl.ticket_id, tl.user_id, tl.started_at, tl.stopped_at, tl.duration_seconds,
            t.ticket_number, t.title as ticket_title,
            p.name as project_name, u.name as user_name
     FROM ticket_timelogs tl
     LEFT JOIN tickets t ON t.id = tl.ticket_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = tl.user_id
     WHERE ${ttWhere}
     ORDER BY tl.started_at ASC`,
    ttParams
  ) as any[]

  // QC timelogs for the day
  const qcParams: any[] = [date]
  let qcWhere = 'DATE(tl.started_at) = ? AND tl.stopped_at IS NOT NULL'
  if (effectiveUserId) { qcWhere += ' AND tl.user_id = ?'; qcParams.push(effectiveUserId) }

  const [qcTimelogs] = await db.execute(
    `SELECT tl.id, tl.qc_form_id, tl.user_id, tl.started_at, tl.stopped_at, tl.duration_seconds,
            qf.sequence as form_sequence, t.title as task_title,
            p.name as project_name, u.name as user_name
     FROM qc_timelogs tl
     LEFT JOIN qc_forms qf ON qf.id = tl.qc_form_id
     LEFT JOIN tasks t ON t.id = qf.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = tl.user_id
     WHERE ${qcWhere}
     ORDER BY tl.started_at ASC`,
    qcParams
  ).catch(() => [[], []]) as any[]

  const tlArr = timelogs as any[]
  const taArr = ticketActivities as any[]
  const ttArr = ticketTimelogs as any[]
  const qtArr = Array.isArray(qcTimelogs) ? qcTimelogs as any[] : []
  const sum = (arr: any[]) => arr.reduce((s: number, r: any) => s + Number(r.duration_seconds || 0), 0)

  return {
    timelogs: tlArr,
    ticket_activities: taArr,
    ticket_timelogs: ttArr,
    qc_timelogs: qtArr,
    summary: {
      total_task_seconds: sum(tlArr),
      total_ticket_seconds: sum(ttArr),
      total_qc_seconds: sum(qtArr),
      tasks_count: new Set(tlArr.map((r: any) => r.task_id)).size,
      tickets_count: taArr.length,
      qc_forms_count: new Set(qtArr.map((r: any) => r.qc_form_id)).size,
    },
  }
}

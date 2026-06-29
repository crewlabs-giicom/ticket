import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()

  if (user.role === 'customer') throw createError({ statusCode: 403 })

  const q = getQuery(event)
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
  const date = String(q.date || today)
  const userId = q.user_id ? Number(q.user_id) : null

  // Task timelogs for the day
  // Staff can only see their own data regardless of user_id param
  const effectiveUserId = user.role === 'staff' ? user.id : userId

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

  // Tickets handled today — unique per ticket, from responses, chat messages, or resolved today
  const taParams: any[] = [date]
  let respExistsCond = 'DATE(tr.created_at) = ?'
  if (effectiveUserId) { respExistsCond += ' AND tr.user_id = ?'; taParams.push(effectiveUserId) }

  taParams.push(date)
  let chatExistsCond = 'DATE(tm.created_at) = ?'
  if (effectiveUserId) { chatExistsCond += ' AND tm.sender_id = ?'; taParams.push(effectiveUserId) }

  taParams.push(date)
  let staffProjectFilter = ''
  if (user.role === 'staff') {
    staffProjectFilter = ' AND tk.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
    taParams.push(user.id)
  }

  const [ticketActivities] = await db.execute(
    `SELECT tk.id as ticket_id, tk.ticket_number, tk.title as ticket_title,
            tk.resolved_at, p.name as project_name, u.name as user_name
     FROM tickets tk
     LEFT JOIN projects p ON p.id = tk.project_id
     LEFT JOIN users u ON u.id = tk.assigned_to
     WHERE (
       EXISTS (SELECT 1 FROM ticket_responses tr WHERE tr.ticket_id = tk.id AND ${respExistsCond})
       OR EXISTS (SELECT 1 FROM ticket_messages tm WHERE tm.ticket_id = tk.id AND ${chatExistsCond})
       OR DATE(tk.resolved_at) = ?
     )${staffProjectFilter}
     ORDER BY tk.resolved_at IS NULL ASC, tk.resolved_at DESC, tk.id DESC`,
    taParams
  ) as any[]

  const tlArr = timelogs as any[]
  const taArr = ticketActivities as any[]
  const totalTaskSeconds = tlArr.reduce((s: number, r: any) => s + Number(r.duration_seconds || 0), 0)
  const uniqueTasks = new Set(tlArr.map((r: any) => r.task_id)).size
  const uniqueTickets = taArr.length

  let selectedUser: any = null
  if (userId) {
    const [uRows] = await db.execute('SELECT id, name FROM users WHERE id = ?', [userId]) as any[]
    selectedUser = (uRows as any[])[0] || null
  }

  return {
    date,
    user: selectedUser,
    timelogs: tlArr,
    ticket_activities: taArr,
    summary: {
      total_task_seconds: totalTaskSeconds,
      tasks_count: uniqueTasks,
      tickets_count: uniqueTickets,
    }
  }
})

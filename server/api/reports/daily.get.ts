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

  // Ticket responses for the day
  const respParams: any[] = [date]
  let respWhere = 'DATE(tr.created_at) = ?'
  if (effectiveUserId) { respWhere += ' AND tr.user_id = ?'; respParams.push(effectiveUserId) }

  if (user.role === 'staff') {
    respWhere += ' AND tk.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)'
    respParams.push(user.id)
  }

  const [ticketActivities] = await db.execute(
    `SELECT tr.id, tr.ticket_id, tr.is_internal, tr.created_at,
            tk.ticket_number, tk.title as ticket_title,
            p.name as project_name, u.name as user_name
     FROM ticket_responses tr
     LEFT JOIN tickets tk ON tk.id = tr.ticket_id
     LEFT JOIN projects p ON p.id = tk.project_id
     LEFT JOIN users u ON u.id = tr.user_id
     WHERE ${respWhere}
     ORDER BY tr.created_at ASC`,
    respParams
  ) as any[]

  const tlArr = timelogs as any[]
  const taArr = ticketActivities as any[]
  const totalTaskSeconds = tlArr.reduce((s: number, r: any) => s + Number(r.duration_seconds || 0), 0)
  const uniqueTasks = new Set(tlArr.map((r: any) => r.task_id)).size
  const uniqueTickets = new Set(taArr.map((r: any) => r.ticket_id)).size

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

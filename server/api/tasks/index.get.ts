import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const q = getQuery(event)

  if (user.role === 'customer') {
    // Customer hanya bisa lihat tasks di project yang mereka jadi project admin
    conditions.push(`t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ? AND project_role = 'admin')`)
    params.push(user.id)
  }

  const conditions: string[] = []
  const params: any[] = []

  if (q.project_ids) {
    const ids = String(q.project_ids).split(',').map(Number).filter(Boolean)
    if (ids.length) {
      conditions.push(`t.project_id IN (${ids.map(() => '?').join(',')})`)
      params.push(...ids)
    }
  } else if (q.project_id) {
    conditions.push('t.project_id = ?')
    params.push(Number(q.project_id))
  }
  if (q.assigned_to) {
    conditions.push('t.assigned_to = ?')
    params.push(Number(q.assigned_to))
  }
  if (q.status) {
    conditions.push('t.status = ?')
    params.push(q.status)
  }
  if (q.date_from) { conditions.push('DATE(t.created_at) >= ?'); params.push(q.date_from) }
  if (q.date_to)   { conditions.push('DATE(t.created_at) <= ?'); params.push(q.date_to) }
  if (q.created_by) { conditions.push('t.created_by = ?'); params.push(Number(q.created_by)) }

  // Default: hide archived tasks, opt-in with show_archived=1
  if (q.show_archived !== '1') conditions.push('t.is_archived = 0')

  // Staff see only tasks in their member projects
  if (user.role === 'staff') {
    conditions.push('t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)')
    params.push(user.id)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const paginate = q.paginate !== 'false'
  const maxLimit = q.export === '1' ? 9999 : 500
  const limit = Math.min(Number(q.limit) || 50, maxLimit)
  const page = Math.max(Number(q.page) || 1, 1)
  const offset = (page - 1) * limit

  const baseQuery = `SELECT t.*, p.name as project_name,
          u.name as assigned_to_name, u.avatar as assigned_to_avatar,
          cb.name as created_by_name,
          (SELECT COUNT(*) FROM tickets tk WHERE tk.task_id = t.id) as ticket_count,
          pv.version_number as prd_version_number
   FROM tasks t
   LEFT JOIN projects p ON p.id = t.project_id
   LEFT JOIN users u ON u.id = t.assigned_to
   LEFT JOIN users cb ON cb.id = t.created_by
   LEFT JOIN prd_versions pv ON pv.id = t.prd_version_id
   ${where}
   ORDER BY t.project_id ASC, t.position ASC, t.created_at DESC`

  // Kanban group view: return ALL tasks grouped by project (no pagination)
  if (q.group_by === 'project') {
    const [allRows] = await db.execute(baseQuery, params)
    const projMap = new Map<number, { project_id: number; project_name: string; tasks: any[] }>()
    for (const row of allRows as any[]) {
      if (!projMap.has(row.project_id)) {
        projMap.set(row.project_id, { project_id: row.project_id, project_name: row.project_name, tasks: [] })
      }
      projMap.get(row.project_id)!.tasks.push(row)
    }
    return [...projMap.values()]
  }

  if (!paginate) {
    const [rows] = await db.execute(baseQuery, params)
    return rows
  }

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tasks t ${where}`, params
  ) as any[]

  const [[aggStats]] = await db.execute(
    `SELECT
      COUNT(*) as total_all,
      SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count,
      SUM((SELECT COUNT(*) FROM tickets tk WHERE tk.task_id = t.id)) as total_tickets
    FROM tasks t ${where}`,
    params
  ) as any[]

  const [rows] = await db.execute(`${baseQuery} LIMIT ? OFFSET ?`, [...params, limit, offset])

  return {
    data: rows, total, page, limit, totalPages: Math.ceil(total / limit),
    stats: {
      total: Number(aggStats?.total_all ?? 0),
      open: Number(aggStats?.open_count ?? 0),
      done: Number(aggStats?.done_count ?? 0),
      totalTickets: Number(aggStats?.total_tickets ?? 0),
    }
  }
})

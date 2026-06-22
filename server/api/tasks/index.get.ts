import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const q = getQuery(event)

  if (user.role === 'customer') return { success: true, data: [] }

  const conditions: string[] = []
  const params: any[] = []

  if (q.project_id) {
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

  // Staff see only tasks in their member projects
  if (user.role === 'staff') {
    conditions.push('t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)')
    params.push(user.id)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const paginate = q.paginate !== 'false'
  const limit = Math.min(Number(q.limit) || 50, 500)
  const page = Math.max(Number(q.page) || 1, 1)
  const offset = (page - 1) * limit

  const baseQuery = `SELECT t.*, p.name as project_name,
          u.name as assigned_to_name, u.avatar as assigned_to_avatar,
          (SELECT COUNT(*) FROM tickets tk WHERE tk.task_id = t.id) as ticket_count
   FROM tasks t
   LEFT JOIN projects p ON p.id = t.project_id
   LEFT JOIN users u ON u.id = t.assigned_to
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

  const [rows] = await db.execute(`${baseQuery} LIMIT ? OFFSET ?`, [...params, limit, offset])

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
})

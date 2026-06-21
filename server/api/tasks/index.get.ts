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

  const [rows] = await db.execute(
    `SELECT t.*, p.name as project_name,
            u.name as assigned_to_name, u.avatar as assigned_to_avatar,
            (SELECT COUNT(*) FROM tickets tk WHERE tk.task_id = t.id) as ticket_count
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assigned_to
     ${where}
     ORDER BY t.project_id ASC, t.position ASC, t.created_at DESC`,
    params
  )

  if (q.group_by === 'project') {
    const projMap = new Map<number, { project_id: number; project_name: string; tasks: any[] }>()
    for (const row of rows as any[]) {
      if (!projMap.has(row.project_id)) {
        projMap.set(row.project_id, { project_id: row.project_id, project_name: row.project_name, tasks: [] })
      }
      projMap.get(row.project_id)!.tasks.push(row)
    }
    return [...projMap.values()]
  }

  return rows
})

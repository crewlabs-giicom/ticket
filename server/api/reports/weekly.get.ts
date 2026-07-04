import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const query = getQuery(event)
  const from = query.from as string
  const to = query.to as string
  const project_id = query.project_id as string | undefined

  if (!from || !to) {
    return { success: true, data: { tickets: [], tasks: [], qc_forms: [], projects: [] } }
  }

  let projectFilter = ''
  const projectParams: any[] = []
  if (project_id) { projectFilter = ' AND t.project_id = ?'; projectParams.push(project_id) }

  const [tickets] = await db.execute(`
    SELECT t.id, t.project_id, t.ticket_number, t.title,
      s.name as status_name, s.color as status_color, s.is_resolved,
      u.name as assigned_to_name,
      t.created_at, t.resolved_at
    FROM tickets t
    JOIN ticket_statuses s ON s.id = t.status_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE DATE(t.created_at) BETWEEN ? AND ?${projectFilter}
    ORDER BY t.created_at DESC
  `, [from, to, ...projectParams])

  let taskProjectFilter = ''
  const taskProjectParams: any[] = []
  if (project_id) { taskProjectFilter = ' AND ta.project_id = ?'; taskProjectParams.push(project_id) }

  const [tasks] = await db.execute(`
    SELECT ta.id, ta.project_id, ta.title, ta.status,
      u.name as assigned_to_name,
      ta.created_at, ta.due_date
    FROM tasks ta
    LEFT JOIN users u ON u.id = ta.assigned_to
    WHERE DATE(ta.created_at) BETWEEN ? AND ?${taskProjectFilter}
    ORDER BY ta.created_at DESC
  `, [from, to, ...taskProjectParams])

  let qcProjectFilter = ''
  const qcProjectParams: any[] = []
  if (project_id) { qcProjectFilter = ' AND ta.project_id = ?'; qcProjectParams.push(project_id) }

  const [qcForms] = await db.execute(`
    SELECT qf.id, ta.project_id, ta.title as task_title, qf.status,
      GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as checkers,
      qf.created_at, qf.updated_at
    FROM qc_forms qf
    JOIN tasks ta ON ta.id = qf.task_id
    LEFT JOIN qc_form_checkers qfc ON qfc.qc_form_id = qf.id
    LEFT JOIN users u ON u.id = qfc.user_id
    WHERE DATE(qf.created_at) BETWEEN ? AND ?${qcProjectFilter}
    GROUP BY qf.id
    ORDER BY qf.created_at DESC
  `, [from, to, ...qcProjectParams])

  const projectIds = new Set<number>()
  for (const row of tickets as any[]) projectIds.add(row.project_id)
  for (const row of tasks as any[]) projectIds.add(row.project_id)
  for (const row of qcForms as any[]) projectIds.add(row.project_id)

  let projects: any[] = []
  if (projectIds.size) {
    const ids = Array.from(projectIds)
    const placeholders = ids.map(() => '?').join(',')
    const [rows] = await db.execute(`SELECT id, name FROM projects WHERE id IN (${placeholders})`, ids)
    projects = rows as any[]
  }

  return {
    success: true,
    data: { tickets, tasks, qc_forms: qcForms, projects, from, to }
  }
})

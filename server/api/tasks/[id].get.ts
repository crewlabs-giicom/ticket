import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')

  const [rows] = await db.execute(
    `SELECT t.*, p.name as project_name, u.name as assigned_to_name,
            cb.name as created_by_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN users cb ON cb.id = t.created_by
     WHERE t.id = ?`,
    [id]
  )
  const task = (rows as any[])[0]
  if (!task) throw createError({ statusCode: 404, message: 'Task not found' })

  const [tickets] = await db.execute(
    `SELECT tk.id, tk.ticket_number, tk.title, tk.status_id, ts.name as status_name, ts.color as status_color
     FROM tickets tk
     LEFT JOIN ticket_statuses ts ON ts.id = tk.status_id
     WHERE tk.task_id = ?`,
    [id]
  )

  return { ...task, tickets }
})

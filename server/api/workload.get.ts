import { getDb } from '../database/index'
import { requireRole } from '../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = getDb()

  const [rows] = await db.execute(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      SUM(CASE WHEN t.status = 'backlog' THEN 1 ELSE 0 END) as task_backlog,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as task_todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as task_in_progress,
      SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as task_review,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as task_done,
      COUNT(t.id) as task_total,
      (SELECT COUNT(*) FROM tickets tk WHERE tk.assigned_to = u.id AND tk.status_id NOT IN (
        SELECT id FROM ticket_statuses WHERE is_resolved = 1
      )) as ticket_active,
      (SELECT COUNT(*) FROM tickets tk WHERE tk.assigned_to = u.id AND tk.due_date < NOW() AND tk.status_id NOT IN (
        SELECT id FROM ticket_statuses WHERE is_resolved = 1
      )) as ticket_overdue
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.status != 'done'
    WHERE u.role IN ('staff','admin') AND u.is_active = 1
    GROUP BY u.id, u.name, u.email, u.role
    ORDER BY (task_in_progress + task_review + ticket_active) DESC
  `)

  return rows
})

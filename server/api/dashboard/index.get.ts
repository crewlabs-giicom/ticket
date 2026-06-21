import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const today = new Date().toISOString().slice(0, 10)

  const isAdmin = user.role === 'admin' || user.role === 'staff'
  const userFilter = isAdmin ? '' : `AND t.created_by = ${user.id}`

  const [statsRows] = await db.execute(`
    SELECT
      SUM(CASE WHEN DATE(t.created_at) = ? THEN 1 ELSE 0 END) as tickets_today,
      SUM(CASE WHEN DATE(t.updated_at) = ? AND s.is_resolved = 1 THEN 1 ELSE 0 END) as tickets_closed_today,
      SUM(CASE WHEN s.is_resolved = 0 THEN 1 ELSE 0 END) as tickets_open,
      SUM(CASE WHEN t.sla_breached = 1 AND s.is_resolved = 0 THEN 1 ELSE 0 END) as tickets_overdue
    FROM tickets t
    JOIN ticket_statuses s ON s.id = t.status_id
    WHERE 1=1 ${userFilter}
  `, [today, today])
  const stats = (statsRows as any[])[0]

  const [slaRows] = await db.execute(`
    SELECT
      ROUND(AVG(CASE WHEN fr.first_response IS NOT NULL THEN TIMESTAMPDIFF(SECOND, t.created_at, fr.first_response) / 3600.0 END), 1) as avg_first_response,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, t.created_at, t.resolved_at) / 3600.0 END), 1) as avg_resolution,
      ROUND(100.0 * SUM(CASE WHEN t.sla_breached = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as sla_met_pct,
      ROUND(100.0 * SUM(CASE WHEN t.sla_breached = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as sla_breach_pct
    FROM tickets t
    LEFT JOIN (
      SELECT ticket_id, MIN(created_at) as first_response FROM ticket_responses WHERE is_internal = 0 GROUP BY ticket_id
    ) fr ON fr.ticket_id = t.id
    WHERE DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${userFilter}
  `)
  const sla = (slaRows as any[])[0]

  const [byStatus] = await db.execute(`
    SELECT s.name, s.color, COUNT(t.id) as count
    FROM ticket_statuses s
    LEFT JOIN tickets t ON t.status_id = s.id ${userFilter ? `AND (t.id IS NULL OR (${userFilter.replace('AND ', '')}))` : ''}
    GROUP BY s.id ORDER BY s.order_index
  `)

  const [byPriority] = await db.execute(`
    SELECT p.name, p.color, COUNT(t.id) as count
    FROM priorities p
    LEFT JOIN tickets t ON t.priority_id = p.id ${userFilter ? `AND (t.id IS NULL OR (${userFilter.replace('AND ', '')}))` : ''}
    GROUP BY p.id ORDER BY p.order_index
  `)

  const [trend] = await db.execute(`
    SELECT DATE(created_at) as date,
      COUNT(*) as created,
      SUM(CASE WHEN status_id IN (SELECT id FROM ticket_statuses WHERE is_resolved=1) THEN 1 ELSE 0 END) as closed
    FROM tickets
    WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
    GROUP BY DATE(created_at) ORDER BY date ASC
  `)

  const [overdue] = await db.execute(`
    SELECT t.id, t.ticket_number, t.title, t.due_date, t.created_at,
      pr.name as priority_name, pr.color as priority_color,
      s.name as status_name,
      u.name as assigned_to_name,
      ROUND(TIMESTAMPDIFF(SECOND, t.due_date, NOW()) / 3600.0, 0) as hours_overdue
    FROM tickets t
    JOIN priorities pr ON pr.id = t.priority_id
    JOIN ticket_statuses s ON s.id = t.status_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.sla_breached = 1 AND s.is_resolved = 0 ${userFilter}
    ORDER BY t.due_date ASC LIMIT 10
  `)

  const [workload] = await db.execute(`
    SELECT u.id, u.name, u.avatar,
      COUNT(t.id) as open_tickets,
      SUM(CASE WHEN t.sla_breached = 1 THEN 1 ELSE 0 END) as overdue_tickets
    FROM users u
    LEFT JOIN tickets t ON t.assigned_to = u.id
      AND t.status_id IN (SELECT id FROM ticket_statuses WHERE is_resolved = 0)
    WHERE u.role = 'staff' AND u.is_active = 1
    GROUP BY u.id ORDER BY open_tickets DESC
  `)

  const [activity] = await db.execute(`
    SELECT type, created_at, message, user_name, user_avatar, ticket_number, ticket_id
    FROM (
      SELECT 'response' as type, r.created_at, r.message, u.name as user_name, u.avatar as user_avatar, t.ticket_number, t.id as ticket_id
      FROM ticket_responses r
      JOIN users u ON u.id = r.user_id
      JOIN tickets t ON t.id = r.ticket_id
      WHERE r.is_internal = 0
      UNION ALL
      SELECT 'ticket' as type, t.created_at, t.title as message, u.name as user_name, u.avatar as user_avatar, t.ticket_number, t.id as ticket_id
      FROM tickets t JOIN users u ON u.id = t.created_by
    ) activity_feed
    ORDER BY created_at DESC
    LIMIT 15
  `)

  const [topProjects] = await db.execute(`
    SELECT p.id, p.name, COUNT(t.id) as open_count
    FROM projects p
    LEFT JOIN tickets t ON t.project_id = p.id
      AND t.status_id IN (SELECT id FROM ticket_statuses WHERE is_resolved = 0)
    WHERE p.is_active = 1
    GROUP BY p.id ORDER BY open_count DESC LIMIT 5
  `)

  return {
    success: true,
    data: { stats, sla, byStatus, byPriority, trend, overdue, workload, activity, topProjects }
  }
})

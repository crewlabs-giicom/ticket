import { getDb } from '../../database/index'

export default defineEventHandler((event) => {
  const db = getDb()
  const query = getQuery(event)
  const from = query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = query.to || new Date().toISOString().slice(0, 10)
  const project_id = query.project_id
  const staff_id = query.staff_id
  const priority_id = query.priority_id

  let where = `date(t.created_at) BETWEEN ? AND ?`
  const params: any[] = [from, to]
  if (project_id) { where += ' AND t.project_id = ?'; params.push(project_id) }
  if (staff_id) { where += ' AND t.assigned_to = ?'; params.push(staff_id) }
  if (priority_id) { where += ' AND t.priority_id = ?'; params.push(priority_id) }

  const timeReport = db.prepare(`
    SELECT
      COUNT(t.id) as total,
      ROUND(AVG(CASE WHEN fr.first_response IS NOT NULL THEN (julianday(fr.first_response) - julianday(t.created_at)) * 24 END), 2) as avg_first_response_hrs,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 24 END), 2) as avg_resolution_hrs,
      SUM(CASE WHEN t.sla_breached = 0 THEN 1 ELSE 0 END) as sla_met,
      SUM(CASE WHEN t.sla_breached = 1 THEN 1 ELSE 0 END) as sla_breach,
      ROUND(100.0 * SUM(CASE WHEN t.sla_breached = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as sla_met_pct
    FROM tickets t
    LEFT JOIN (SELECT ticket_id, MIN(created_at) as first_response FROM ticket_responses WHERE is_internal=0 GROUP BY ticket_id) fr ON fr.ticket_id = t.id
    WHERE ${where}
  `).get(...params)

  const byPriorityTime = db.prepare(`
    SELECT pr.name, pr.color,
      COUNT(t.id) as total,
      SUM(t.sla_breached) as sla_breach,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 24 END), 1) as avg_hrs
    FROM tickets t JOIN priorities pr ON pr.id = t.priority_id
    WHERE ${where}
    GROUP BY pr.id ORDER BY pr.order_index
  `).all(...params)

  const workReport = db.prepare(`
    SELECT
      SUM(CASE WHEN s.is_resolved = 0 THEN 1 ELSE 0 END) as total_open,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as total_resolved,
      COUNT(t.id) as total
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where}
  `).get(...params)

  const byStatus = db.prepare(`
    SELECT s.name, s.color, COUNT(t.id) as count
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where} GROUP BY s.id ORDER BY s.order_index
  `).all(...params)

  const byStaff = db.prepare(`
    SELECT u.id, u.name,
      COUNT(t.id) as total,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as resolved,
      SUM(t.sla_breached) as sla_breach
    FROM tickets t
    JOIN users u ON u.id = t.assigned_to
    JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where}
    GROUP BY u.id ORDER BY total DESC
  `).all(...params)

  const dailyTrend = db.prepare(`
    SELECT date(t.created_at) as date, COUNT(*) as created,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as resolved
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where} GROUP BY date(t.created_at) ORDER BY date ASC
  `).all(...params)

  return {
    success: true,
    data: { timeReport, byPriorityTime, workReport, byStatus, byStaff, dailyTrend, from, to }
  }
})

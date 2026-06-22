import { getDb } from '../../database/index'
import { todayWIB, daysAgoWIB } from '../../utils/date'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const query = getQuery(event)
  const from = query.from || daysAgoWIB(30)
  const to = query.to || todayWIB()
  const project_id = query.project_id
  const staff_id = query.staff_id
  const priority_id = query.priority_id

  let where = `DATE(t.created_at) BETWEEN ? AND ?`
  const params: any[] = [from, to]
  if (project_id) { where += ' AND t.project_id = ?'; params.push(project_id) }
  if (staff_id) { where += ' AND t.assigned_to = ?'; params.push(staff_id) }
  if (priority_id) { where += ' AND t.priority_id = ?'; params.push(priority_id) }

  const [timeReportRows] = await db.execute(`
    SELECT
      COUNT(t.id) as total,
      ROUND(AVG(CASE WHEN fr.first_response IS NOT NULL THEN TIMESTAMPDIFF(SECOND, t.created_at, fr.first_response) / 3600.0 END), 2) as avg_first_response_hrs,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, t.created_at, t.resolved_at) / 3600.0 END), 2) as avg_resolution_hrs,
      SUM(CASE WHEN t.sla_breached = 0 THEN 1 ELSE 0 END) as sla_met,
      SUM(CASE WHEN t.sla_breached = 1 THEN 1 ELSE 0 END) as sla_breach,
      ROUND(100.0 * SUM(CASE WHEN t.sla_breached = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as sla_met_pct
    FROM tickets t
    LEFT JOIN (SELECT ticket_id, MIN(created_at) as first_response FROM ticket_responses WHERE is_internal=0 GROUP BY ticket_id) fr ON fr.ticket_id = t.id
    WHERE ${where}
  `, params)
  const timeReport = (timeReportRows as any[])[0]

  const [byPriorityTime] = await db.execute(`
    SELECT pr.name, pr.color,
      COUNT(t.id) as total,
      SUM(t.sla_breached) as sla_breach,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, t.created_at, t.resolved_at) / 3600.0 END), 1) as avg_hrs
    FROM tickets t JOIN priorities pr ON pr.id = t.priority_id
    WHERE ${where}
    GROUP BY pr.id ORDER BY pr.order_index
  `, params)

  const [workReportRows] = await db.execute(`
    SELECT
      SUM(CASE WHEN s.is_resolved = 0 THEN 1 ELSE 0 END) as total_open,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as total_resolved,
      COUNT(t.id) as total
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where}
  `, params)
  const workReport = (workReportRows as any[])[0]

  const [byStatus] = await db.execute(`
    SELECT s.name, s.color, COUNT(t.id) as count
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where} GROUP BY s.id ORDER BY s.order_index
  `, params)

  const [byStaff] = await db.execute(`
    SELECT u.id, u.name,
      COUNT(t.id) as total,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as resolved,
      SUM(t.sla_breached) as sla_breach
    FROM tickets t
    JOIN users u ON u.id = t.assigned_to
    JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where}
    GROUP BY u.id ORDER BY total DESC
  `, params)

  const [dailyTrend] = await db.execute(`
    SELECT DATE(t.created_at) as date, COUNT(*) as created,
      SUM(CASE WHEN s.is_resolved = 1 THEN 1 ELSE 0 END) as resolved
    FROM tickets t JOIN ticket_statuses s ON s.id = t.status_id
    WHERE ${where} GROUP BY DATE(t.created_at) ORDER BY date ASC
  `, params)

  return {
    success: true,
    data: { timeReport, byPriorityTime, workReport, byStatus, byStaff, dailyTrend, from, to }
  }
})

import { getDb } from '../../../database/index'
import { resolveRegisteredSystemByApiKey, resolveUserByEmail } from '../../../utils/externalAuth'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const query = getQuery(event)

  let where = 't.project_id = ?'
  const params: any[] = [system.project_id]

  if (query.status_ids) {
    const ids = String(query.status_ids).split(',').map(Number).filter(Boolean)
    if (ids.length) { where += ` AND t.status_id IN (${ids.map(() => '?').join(',')})`; params.push(...ids) }
  } else if (query.status_id) { where += ' AND t.status_id = ?'; params.push(query.status_id) }
  if (query.priority_ids) {
    const ids = String(query.priority_ids).split(',').map(Number).filter(Boolean)
    if (ids.length) { where += ` AND t.priority_id IN (${ids.map(() => '?').join(',')})`; params.push(...ids) }
  } else if (query.priority_id) { where += ' AND t.priority_id = ?'; params.push(query.priority_id) }
  if (query.search) { where += ' AND (t.title LIKE ? OR t.ticket_number LIKE ?)'; params.push(`%${query.search}%`, `%${query.search}%`) }
  if (query.date_from) { where += ' AND DATE(t.created_at) >= ?'; params.push(query.date_from) }
  if (query.date_to) { where += ' AND DATE(t.created_at) <= ?'; params.push(query.date_to) }
  if (query.created_by_email) {
    where += ' AND t.created_by IN (SELECT id FROM users WHERE email = ?)'
    params.push(query.created_by_email)
  }
  if (query.extended === '1') {
    where += ` AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.entity_type = 'ticket' AND al.entity_id = t.id AND al.action = 'due_date_extended')`
  }

  let viewerId: number | null = null
  if (query.viewer_email) {
    const viewer = await resolveUserByEmail(db, String(query.viewer_email))
    viewerId = viewer?.id ?? null
  }

  const SORTABLE_COLUMNS: Record<string, string> = {
    created_at: 't.created_at',
    due_date: 't.due_date',
    ticket_number: 't.ticket_number',
    priority_id: 't.priority_id',
    status_id: 't.status_id',
  }
  const sortCol = SORTABLE_COLUMNS[String(query.sort_by)] || SORTABLE_COLUMNS.created_at
  const sortDir = String(query.sort_dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  const limit = Math.min(Number(query.limit) || 50, 200)
  const page = Math.max(Number(query.page) || 1, 1)
  const offset = (page - 1) * limit

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM tickets t WHERE ${where}`, params
  ) as any[]

  const [tickets] = await db.execute(`
    SELECT t.*,
      pr.name as priority_name, pr.color as priority_color,
      s.name as status_name, s.color as status_color, s.is_resolved as status_is_resolved,
      u1.name as created_by_name, u1.email as created_by_email,
      u2.name as assigned_to_name,
      sm.name as system_menu_name,
      (SELECT COUNT(*) FROM ticket_responses r WHERE r.ticket_id = t.id AND r.is_internal = 0) as response_count,
      (SELECT COUNT(*) FROM ticket_attachments a WHERE a.ticket_id = t.id) as attachment_count,
      EXISTS (
        SELECT 1 FROM ticket_responses r
        WHERE r.ticket_id = t.id
          AND r.is_internal = 0
          AND r.user_id != ?
          AND r.id > COALESCE(
            (SELECT last_read_response_id FROM ticket_response_reads trr WHERE trr.ticket_id = t.id AND trr.user_id = ?), 0)
      ) as has_unread_response
    FROM tickets t
    LEFT JOIN priorities pr ON pr.id = t.priority_id
    LEFT JOIN ticket_statuses s ON s.id = t.status_id
    LEFT JOIN users u1 ON u1.id = t.created_by
    LEFT JOIN users u2 ON u2.id = t.assigned_to
    LEFT JOIN system_menus sm ON sm.id = t.system_menu_id
    WHERE ${where}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `, [viewerId ?? 0, viewerId ?? 0, ...params, limit, offset])

  if (!viewerId) {
    for (const t of tickets as any[]) t.has_unread_response = false
  }

  return { success: true, data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) }
})

import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const q = getQuery(event) as any

  const params: any[] = []
  const wheres: string[] = []

  if (user.role === 'customer') {
    wheres.push('EXISTS (SELECT 1 FROM qc_form_checkers fc WHERE fc.qc_form_id = qf.id AND fc.user_id = ?)')
    params.push(user.id)
  }

  if (q.status) {
    wheres.push('qf.status = ?')
    params.push(q.status)
  }
  if (q.search) {
    wheres.push('(t.title LIKE ? OR p.name LIKE ?)')
    params.push(`%${q.search}%`, `%${q.search}%`)
  }
  if (q.project_id) {
    wheres.push('t.project_id = ?')
    params.push(q.project_id)
  }
  if (q.checker_id) {
    wheres.push('EXISTS (SELECT 1 FROM qc_form_checkers fc WHERE fc.qc_form_id = qf.id AND fc.user_id = ?)')
    params.push(q.checker_id)
  }
  if (q.template_id) {
    wheres.push('qf.qc_template_id = ?')
    params.push(q.template_id)
  }
  if (q.loop_only === '1') {
    wheres.push('qf.sequence > 1')
  }
  if (q.date_from) {
    wheres.push('DATE(qf.created_at) >= ?')
    params.push(q.date_from)
  }
  if (q.date_to) {
    wheres.push('DATE(qf.created_at) <= ?')
    params.push(q.date_to)
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  const limit = Math.min(Number(q.limit) || 50, 100)
  const page = Math.max(Number(q.page) || 1, 1)
  const offset = (page - 1) * limit

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     ${where}`,
    params
  ) as any[]

  const [rows] = await db.execute(
    `SELECT qf.id, qf.sequence, qf.status, qf.created_at,
       t.id as task_id, t.title as task_title,
       p.name as project_name, p.id as project_id,
       qt.name as template_name, qt.id as template_id,
       u.name as created_by_name,
       (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id) as checker_count,
       (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id AND is_done = 1) as done_count,
       (SELECT GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ')
        FROM qc_form_checkers fc2 JOIN users u2 ON u2.id = fc2.user_id
        WHERE fc2.qc_form_id = qf.id) as checker_names
     FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN qc_templates qt ON qt.id = qf.qc_template_id
     JOIN users u ON u.id = qf.created_by
     ${where}
     ORDER BY qf.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  ) as any[]

  return { success: true, data: rows, total, totalPages: Math.ceil(total / limit), page }
})

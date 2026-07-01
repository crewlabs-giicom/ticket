import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const q = getQuery(event) as any

  const status = q.status || ''
  const search = q.search || ''

  const params: any[] = []
  const wheres: string[] = []

  if (user.role === 'customer') {
    // Customer only sees forms where they are a checker
    wheres.push('EXISTS (SELECT 1 FROM qc_form_checkers fc WHERE fc.qc_form_id = qf.id AND fc.user_id = ?)')
    params.push(user.id)
  }

  if (status) {
    wheres.push('qf.status = ?')
    params.push(status)
  }
  if (search) {
    wheres.push('(t.title LIKE ? OR p.name LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''

  const [rows] = await db.execute(
    `SELECT qf.id, qf.sequence, qf.status, qf.created_at,
       t.id as task_id, t.title as task_title,
       p.name as project_name,
       qt.name as template_name,
       u.name as created_by_name,
       (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id) as checker_count,
       (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id AND is_done = 1) as done_count
     FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN qc_templates qt ON qt.id = qf.qc_template_id
     JOIN users u ON u.id = qf.created_by
     ${where}
     ORDER BY qf.created_at DESC
     LIMIT 100`,
    params
  ) as any[]

  return { success: true, data: rows }
})

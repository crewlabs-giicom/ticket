import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const projectId = Number(getRouterParam(event, 'id'))

  // PRDs with dates
  const [prds] = await db.execute(
    `SELECT p.id, p.title, p.status,
            p.planned_start_date, p.original_due_date, p.revised_due_date,
            p.actual_start_date, p.actual_end_date
     FROM prds p
     WHERE p.project_id = ? AND p.is_archived = 0
     ORDER BY COALESCE(p.planned_start_date, p.created_at) ASC`,
    [projectId]
  ) as any[]

  // Tasks with dates
  const [tasks] = await db.execute(
    `SELECT t.id, t.title, t.status, t.prd_id,
            t.planned_start_date, t.original_due_date, t.due_date,
            t.actual_start_date, t.actual_end_date, t.estimated_duration,
            u.name as assigned_to_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.project_id = ? AND t.is_archived = 0
     ORDER BY t.prd_id ASC, COALESCE(t.planned_start_date, t.created_at) ASC`,
    [projectId]
  ) as any[]

  // QC Forms with dates
  const [qcForms] = await db.execute(
    `SELECT qf.id, qf.task_id, qf.sequence, qf.status,
            qf.original_due_date, qf.revised_due_date,
            qf.actual_start_date, qf.actual_end_date, qf.estimated_duration,
            t.title as task_title
     FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     WHERE t.project_id = ? AND t.is_archived = 0
     ORDER BY qf.task_id ASC, qf.sequence ASC`,
    [projectId]
  ) as any[]

  return { prds, tasks, qcForms }
})

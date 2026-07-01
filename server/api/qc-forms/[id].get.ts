import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  // Load form
  const [[form]] = await db.execute(
    `SELECT qf.*,
       t.title as task_title, t.status as task_status, t.project_id,
       t.description as task_description,
       t.assigned_to as task_assignee_id,
       t.system_menu_id as task_system_menu_id,
       ua.name as task_assignee_name,
       p.name as project_name,
       qt.name as template_name,
       uc.name as created_by_name
     FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users ua ON ua.id = t.assigned_to
     LEFT JOIN qc_templates qt ON qt.id = qf.qc_template_id
     JOIN users uc ON uc.id = qf.created_by
     WHERE qf.id = ?`,
    [id]
  ) as any[]
  if (!form) throw createError({ statusCode: 404, message: 'QC Form tidak ditemukan' })

  // Permission: admin can see all; staff must be a member of the task's project; customer only if they're a checker
  if (user.role === 'customer') {
    const [[isMember]] = await db.execute(
      `SELECT 1 FROM qc_form_checkers WHERE qc_form_id = ? AND user_id = ?`, [id, user.id]
    ) as any[]
    if (!isMember) throw createError({ statusCode: 403, message: 'Forbidden' })
  } else if (user.role === 'staff') {
    const [[isProjectMember]] = await db.execute(
      `SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?`, [form.project_id, user.id]
    ) as any[]
    if (!isProjectMember) throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Load checkers with their done status
  const [checkers] = await db.execute(
    `SELECT fc.*, u.name, u.email, u.role, u.avatar
     FROM qc_form_checkers fc
     JOIN users u ON u.id = fc.user_id
     WHERE fc.qc_form_id = ?
     ORDER BY fc.id ASC`,
    [id]
  ) as any[]

  // Load checklist items grouped by checker
  const [items] = await db.execute(
    `SELECT qi.*,
       (SELECT GROUP_CONCAT(ticket_id) FROM qc_checklist_item_tickets WHERE qc_checklist_item_id = qi.id) as ticket_ids
     FROM qc_checklist_items qi
     WHERE qi.qc_form_id = ?
     ORDER BY qi.checker_id ASC, qi.id ASC`,
    [id]
  ) as any[]

  // For each item with ticket_ids, load ticket summaries
  const ticketIdSet = new Set<number>()
  for (const item of items as any[]) {
    if (item.ticket_ids) item.ticket_ids.split(',').map(Number).forEach((tid: number) => ticketIdSet.add(tid))
  }
  let ticketMap: Record<number, any> = {}
  if (ticketIdSet.size) {
    const ids = [...ticketIdSet]
    const [tickets] = await db.execute(
      `SELECT t.id, t.ticket_number, t.title, ts.name as status_name, ts.is_resolved, ts.color as status_color
       FROM tickets t
       JOIN ticket_statuses ts ON ts.id = t.status_id
       WHERE t.id IN (${ids.map(() => '?').join(',')})`,
      ids
    ) as any[]
    ticketMap = Object.fromEntries((tickets as any[]).map((t: any) => [t.id, t]))
  }

  // Enrich items with ticket objects
  const enrichedItems = (items as any[]).map((item: any) => ({
    ...item,
    tickets: item.ticket_ids ? item.ticket_ids.split(',').map(Number).map((tid: number) => ticketMap[tid]).filter(Boolean) : [],
  }))

  return { ...form, checkers, items: enrichedItems }
})

import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[prd]] = await db.execute(
    `SELECT p.*, pr.name as project_name, u.name as created_by_name,
            pv.version_number as current_version_number
     FROM prds p
     LEFT JOIN projects pr ON pr.id = p.project_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN prd_versions pv ON pv.id = p.current_version_id
     WHERE p.id = ?`,
    [id]
  ) as any[]

  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  const [versions] = await db.execute(
    `SELECT pv.*, u.name as created_by_name
     FROM prd_versions pv
     LEFT JOIN users u ON u.id = pv.created_by
     WHERE pv.prd_id = ?
     ORDER BY pv.version_number DESC`,
    [id]
  )

  const [milestones] = await db.execute(
    `SELECT m.*,
            (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id) as task_count
     FROM prd_milestones m
     WHERE m.prd_id = ?
     ORDER BY m.\`order\` ASC, m.created_at ASC`,
    [id]
  )

  const [milestoneTasks] = await db.execute(
    `SELECT t.*, u.name as assigned_to_name, u.avatar as assigned_to_avatar, cb.name as created_by_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN users cb ON cb.id = t.created_by
     WHERE t.prd_id = ? AND t.is_archived = 0
     ORDER BY t.milestone_id ASC, t.position ASC`,
    [id]
  )

  const tasksByMilestone: Record<number, any[]> = {}
  for (const task of milestoneTasks as any[]) {
    const mid = task.milestone_id
    if (!tasksByMilestone[mid]) tasksByMilestone[mid] = []
    tasksByMilestone[mid].push(task)
  }

  const milestonesWithTasks = (milestones as any[]).map(m => ({
    ...m,
    tasks: tasksByMilestone[m.id] || []
  }))

  const [requests] = await db.execute(
    `SELECT r.*, u.name as requester_name, p.name as project_name
     FROM requests r
     LEFT JOIN users u ON u.id = r.requester_id
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE r.prd_id = ?
     ORDER BY r.created_at DESC`,
    [id]
  )

  return { ...prd, versions, milestones: milestonesWithTasks, requests }
})

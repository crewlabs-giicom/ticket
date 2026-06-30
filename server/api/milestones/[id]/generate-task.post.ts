import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'title is required' })

  const [[milestone]] = await db.execute(
    `SELECT m.*, p.current_version_id
     FROM prd_milestones m
     JOIN prds p ON p.id = m.prd_id
     WHERE m.id = ?`,
    [id]
  ) as any[]

  if (!milestone) throw createError({ statusCode: 404, statusMessage: 'Milestone not found' })

  // Must belong to the currently active version
  if (milestone.prd_version_id !== milestone.current_version_id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot generate tasks from an outdated PRD version' })
  }

  const [[prd]] = await db.execute(`SELECT project_id FROM prds WHERE id = ?`, [milestone.prd_id]) as any[]

  // Position: next after existing tasks in same project
  const [[{ maxPos }]] = await db.execute(
    `SELECT MAX(position) as maxPos FROM tasks WHERE project_id = ?`, [prd.project_id]
  ) as any[]

  const dueDate = body.due_date || milestone.due_date || null

  const [result] = await db.execute(
    `INSERT INTO tasks (project_id, title, description, status, position, assigned_to, created_by, due_date, prd_id, prd_version_id, milestone_id)
     VALUES (?, ?, ?, 'backlog', ?, ?, ?, ?, ?, ?, ?)`,
    [
      prd.project_id,
      body.title.trim(),
      body.description || null,
      (maxPos || 0) + 1,
      body.assigned_to || null,
      user.id,
      dueDate,
      milestone.prd_id,
      milestone.prd_version_id,
      id
    ]
  ) as any[]

  const [[task]] = await db.execute(
    `SELECT t.*, p.name as project_name, u.name as assigned_to_name, cb.name as created_by_name,
            prd.title as prd_title, pv.version_number as prd_version_number,
            m.name as milestone_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN users cb ON cb.id = t.created_by
     LEFT JOIN prds prd ON prd.id = t.prd_id
     LEFT JOIN prd_versions pv ON pv.id = t.prd_version_id
     LEFT JOIN prd_milestones m ON m.id = t.milestone_id
     WHERE t.id = ?`,
    [(result as any).insertId]
  ) as any[]

  return task
})

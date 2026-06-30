import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const [[prd]] = await db.execute(`SELECT id, current_version_id FROM prds WHERE id = ?`, [id]) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })
  if (!prd.current_version_id) throw createError({ statusCode: 400, statusMessage: 'PRD has no active version' })

  const [[{ maxOrder }]] = await db.execute(
    `SELECT MAX(\`order\`) as maxOrder FROM prd_milestones WHERE prd_id = ? AND prd_version_id = ?`,
    [id, prd.current_version_id]
  ) as any[]

  const [result] = await db.execute(
    `INSERT INTO prd_milestones (prd_id, prd_version_id, name, due_date, \`order\`)
     VALUES (?, ?, ?, ?, ?)`,
    [id, prd.current_version_id, body.name.trim(), body.due_date || null, (maxOrder || 0) + 1]
  ) as any[]

  const [[row]] = await db.execute(
    `SELECT * FROM prd_milestones WHERE id = ?`, [result.insertId]
  ) as any[]

  return row
})

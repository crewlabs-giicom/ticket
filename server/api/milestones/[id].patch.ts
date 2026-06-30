import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const [[row]] = await db.execute(`SELECT id FROM prd_milestones WHERE id = ?`, [id]) as any[]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Milestone not found' })

  const fields: string[] = []
  const values: any[] = []

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name) }
  if (body.due_date !== undefined) { fields.push('due_date = ?'); values.push(body.due_date || null) }
  if (body.order !== undefined) { fields.push('`order` = ?'); values.push(Number(body.order)) }

  if (fields.length) {
    await db.execute(`UPDATE prd_milestones SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
  }

  const [[updated]] = await db.execute(`SELECT * FROM prd_milestones WHERE id = ?`, [id]) as any[]
  return updated
})

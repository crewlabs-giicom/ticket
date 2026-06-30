import { getDb } from '../../../../database/index'
import { requireRole } from '../../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const prdId = Number(getRouterParam(event, 'id'))
  const versionId = Number(getRouterParam(event, 'versionId'))
  const body = await readBody(event)

  // Only allow editing if this version belongs to the prd and is the current active version
  const [[prd]] = await db.execute(
    `SELECT current_version_id FROM prds WHERE id = ?`, [prdId]
  ) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })
  if (prd.current_version_id !== versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Can only edit the active version' })
  }

  const allowed = ['background', 'goals', 'scope_in', 'scope_out', 'requirements', 'technical_approach', 'changelog']
  const fields: string[] = []
  const values: any[] = []

  for (const key of allowed) {
    if (key in body) { fields.push(`${key} = ?`); values.push(body[key]) }
  }

  if (fields.length) {
    await db.execute(`UPDATE prd_versions SET ${fields.join(', ')} WHERE id = ? AND prd_id = ?`, [...values, versionId, prdId])
  }

  const [[row]] = await db.execute(`SELECT * FROM prd_versions WHERE id = ?`, [versionId]) as any[]
  return row
})

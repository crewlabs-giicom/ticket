import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'
import { syncRequestStatusFromPRD } from '../../../utils/prdSync'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const [[prd]] = await db.execute(`SELECT id, status FROM prds WHERE id = ?`, [id]) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  const requestIds: number[] = (body.requestIds || []).map(Number).filter(Boolean)
  if (!requestIds.length) throw createError({ statusCode: 400, statusMessage: 'requestIds is required' })

  const placeholders = requestIds.map(() => '?').join(',')
  await db.execute(
    `UPDATE requests SET prd_id = ? WHERE id IN (${placeholders}) AND status NOT IN ('rejected','standalone')`,
    [id, ...requestIds]
  )

  await syncRequestStatusFromPRD(db as any, id, prd.status)

  return { success: true }
})

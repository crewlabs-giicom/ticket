import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'
import { syncRequestStatusFromPRD } from '../../../utils/prdSync'

const VALID_STATUSES = ['draft', 'in_review', 'approved', 'in_progress', 'done']

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!VALID_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const [[prd]] = await db.execute('SELECT id FROM prds WHERE id = ?', [id]) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  await db.execute(`UPDATE prds SET status = ? WHERE id = ?`, [body.status, id])
  await syncRequestStatusFromPRD(db as any, id, body.status)

  return { success: true, status: body.status }
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'
import { syncRequestStatusFromPRD } from '../../../utils/prdSync'
import { logActivity } from '../../../utils/activity'

const VALID_STATUSES = ['draft', 'in_review', 'approved', 'in_progress', 'done']

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!VALID_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const [[prd]] = await db.execute('SELECT id, status, title FROM prds WHERE id = ?', [id]) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  await db.execute(`UPDATE prds SET status = ? WHERE id = ?`, [body.status, id])

  if (prd.status !== body.status) {
    await logActivity(db, {
      entity_type: 'prd', entity_id: id,
      action: 'status_changed',
      from_value: prd.status, to_value: body.status,
      label: `Status PRD "${prd.title}" diubah oleh ${user.name}`,
      user_id: user.id,
    })
  }

  await syncRequestStatusFromPRD(db as any, id, body.status, user.id)

  return { success: true, status: body.status }
})

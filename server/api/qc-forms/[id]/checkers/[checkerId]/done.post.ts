import { getDb } from '../../../../../database/index'
import { requireAuth } from '../../../../../utils/rbac'
import { checkQcFormCompletion } from '../../../../../utils/qc'
import { logActivity } from '../../../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const formId = Number(getRouterParam(event, 'id'))
  const checkerId = Number(getRouterParam(event, 'checkerId'))

  // Customer can only mark their own done; staff/admin can mark any
  if (user.role === 'customer' && checkerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Validate checker exists in this form
  const [[checker]] = await db.execute(
    `SELECT * FROM qc_form_checkers WHERE qc_form_id = ? AND user_id = ?`,
    [formId, checkerId]
  ) as any[]
  if (!checker) throw createError({ statusCode: 404, message: 'Checker tidak ditemukan di form ini' })

  // Validate all items for this checker are checked
  const [[unchecked]] = await db.execute(
    `SELECT COUNT(*) as c FROM qc_checklist_items WHERE qc_form_id = ? AND checker_id = ? AND is_checked = 0`,
    [formId, checkerId]
  ) as any[]
  if (Number(unchecked.c) > 0) {
    throw createError({ statusCode: 400, message: `Masih ada ${unchecked.c} item yang belum dicentang` })
  }

  await db.execute(
    `UPDATE qc_form_checkers SET is_done = 1, done_at = NOW() WHERE qc_form_id = ? AND user_id = ?`,
    [formId, checkerId]
  )

  await logActivity(db, {
    entity_type: 'qc_form', entity_id: formId,
    action: 'checker_done',
    label: `${user.name} menandai checklist QC selesai`,
    user_id: user.id,
  })

  // Trigger auto-transition check
  await checkQcFormCompletion(db, formId)

  const [[updated]] = await db.execute(`SELECT * FROM qc_form_checkers WHERE qc_form_id = ? AND user_id = ?`, [formId, checkerId]) as any[]
  return updated
})

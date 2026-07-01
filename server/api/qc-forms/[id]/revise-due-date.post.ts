import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!body.new_due_date) throw createError({ statusCode: 400, statusMessage: 'new_due_date wajib diisi' })
  if (!body.reason?.trim()) throw createError({ statusCode: 400, statusMessage: 'reason wajib diisi' })

  const [[form]] = await db.execute(`SELECT original_due_date, revised_due_date FROM qc_forms WHERE id = ?`, [id]) as any[]
  if (!form) throw createError({ statusCode: 404, statusMessage: 'QC Form not found' })

  const previousDueDate = form.revised_due_date || form.original_due_date

  await db.execute(
    `INSERT INTO due_date_revisions (entity_type, entity_id, previous_due_date, new_due_date, reason, revised_by)
     VALUES ('qc_form', ?, ?, ?, ?, ?)`,
    [id, previousDueDate || null, body.new_due_date, body.reason.trim(), user.id]
  )

  await db.execute(`UPDATE qc_forms SET revised_due_date = ? WHERE id = ?`, [body.new_due_date, id])

  return { ok: true, revised_due_date: body.new_due_date }
})

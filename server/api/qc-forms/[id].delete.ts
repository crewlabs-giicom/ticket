import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'
import { deletePolymorphicHistory, logActivity } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[form]] = await db.execute(
    `SELECT qf.id, qf.status, qf.task_id, t.status as task_status, t.title as task_title
     FROM qc_forms qf JOIN tasks t ON t.id = qf.task_id WHERE qf.id = ?`,
    [id]
  ) as any[]
  if (!form) throw createError({ statusCode: 404, statusMessage: 'QC Form not found' })

  // qc_form_checkers, qc_checklist_items and their qc_checklist_item_tickets links all
  // cascade-delete via FK. Tickets created from checklist items survive (qc_checklist_item_id
  // is set to NULL on them), only the polymorphic history needs manual cleanup.
  await deletePolymorphicHistory(db, 'qc_form', [id])
  await db.execute('DELETE FROM qc_forms WHERE id = ?', [id])

  // If this was the task's only/active QC form, the task shouldn't stay stuck in "in_qc"
  // with nothing left to check — bounce it back to review.
  if (form.task_status === 'in_qc') {
    const [[remaining]] = await db.execute(
      `SELECT COUNT(*) as c FROM qc_forms WHERE task_id = ? AND status = 'active'`, [form.task_id]
    ) as any[]
    if (Number(remaining.c) === 0) {
      await db.execute(`UPDATE tasks SET status = 'review' WHERE id = ?`, [form.task_id])
      await logActivity(db, {
        entity_type: 'task', entity_id: form.task_id,
        action: 'status_changed',
        from_value: 'in_qc', to_value: 'review',
        label: `QC form dihapus oleh ${user.name}, task "${form.task_title}" dikembalikan ke Review`,
        user_id: user.id,
      })
    }
  }

  return { success: true }
})

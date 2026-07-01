import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'
import { deletePolymorphicHistory } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[task]] = await db.execute('SELECT id FROM tasks WHERE id = ?', [id]) as any[]
  if (!task) throw createError({ statusCode: 404, statusMessage: 'Task not found' })

  // QC forms cascade-delete via FK, but their polymorphic history (activity_logs,
  // due_date_revisions) doesn't, so it must be cleared explicitly before it's orphaned.
  const [qcForms] = await db.execute('SELECT id FROM qc_forms WHERE task_id = ?', [id]) as any[]
  const qcFormIds = (qcForms as any[]).map(f => f.id)
  if (qcFormIds.length) await deletePolymorphicHistory(db, 'qc_form', qcFormIds)

  await deletePolymorphicHistory(db, 'task', [id])
  await db.execute('DELETE FROM tasks WHERE id = ?', [id])

  return { ok: true }
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!body.new_due_date) throw createError({ statusCode: 400, statusMessage: 'new_due_date wajib diisi' })
  if (!body.reason?.trim()) throw createError({ statusCode: 400, statusMessage: 'reason wajib diisi' })

  const [[task]] = await db.execute(`SELECT due_date FROM tasks WHERE id = ?`, [id]) as any[]
  if (!task) throw createError({ statusCode: 404, statusMessage: 'Task not found' })

  await db.execute(
    `INSERT INTO due_date_revisions (entity_type, entity_id, previous_due_date, new_due_date, reason, revised_by)
     VALUES ('task', ?, ?, ?, ?, ?)`,
    [id, task.due_date || null, body.new_due_date, body.reason.trim(), user.id]
  )

  await db.execute(`UPDATE tasks SET due_date = ? WHERE id = ?`, [body.new_due_date, id])

  return { ok: true, due_date: body.new_due_date }
})

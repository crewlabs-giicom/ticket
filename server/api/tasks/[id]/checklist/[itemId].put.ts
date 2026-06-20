import { getDb } from '../../../../database/index'
import { requireAuth } from '../../../../utils/rbac'
import { logActivity } from '../../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const taskId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readBody(event)

  const [existing] = await db.execute('SELECT * FROM task_checklist_items WHERE id = ? AND task_id = ?', [itemId, taskId]) as any[]
  const item = (existing as any[])[0]
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })

  if ('is_checked' in body) {
    await db.execute('UPDATE task_checklist_items SET is_checked = ? WHERE id = ?', [body.is_checked ? 1 : 0, itemId])
    await logActivity(db, {
      entity_type: 'task',
      entity_id: Number(taskId),
      action: 'checklist_toggled',
      label: `${user.name} ${body.is_checked ? 'mencentang' : 'membatalkan centang'} "${item.title}"`,
      user_id: user.id,
    })
  }
  if ('title' in body && body.title?.trim()) {
    await db.execute('UPDATE task_checklist_items SET title = ? WHERE id = ?', [body.title.trim(), itemId])
  }

  const [rows] = await db.execute('SELECT * FROM task_checklist_items WHERE id = ?', [itemId])
  return { data: (rows as any[])[0] }
})

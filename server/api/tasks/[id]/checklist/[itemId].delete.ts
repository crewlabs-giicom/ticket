import { getDb } from '../../../../database/index'
import { requireAuth } from '../../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const taskId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  await db.execute('DELETE FROM task_checklist_items WHERE id = ? AND task_id = ?', [itemId, taskId])
  return { success: true }
})

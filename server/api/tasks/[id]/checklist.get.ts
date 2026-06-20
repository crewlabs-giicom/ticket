import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const [rows] = await db.execute(
    'SELECT * FROM task_checklist_items WHERE task_id = ? ORDER BY order_index, id',
    [id]
  )
  return { data: rows }
})

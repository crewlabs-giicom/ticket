import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const { title } = await readBody(event)
  if (!title?.trim()) throw createError({ statusCode: 400, message: 'Title required' })

  const [posRows] = await db.execute(
    'SELECT COALESCE(MAX(order_index), -1) + 1 as next FROM task_checklist_items WHERE task_id = ?',
    [id]
  ) as any[]
  const order_index = posRows[0]?.next ?? 0

  const [r] = await db.execute(
    'INSERT INTO task_checklist_items (task_id, title, order_index, created_by) VALUES (?, ?, ?, ?)',
    [id, title.trim(), order_index, user.id]
  ) as [ResultSetHeader, any]

  const [rows] = await db.execute('SELECT * FROM task_checklist_items WHERE id = ?', [r.insertId])
  return { data: (rows as any[])[0] }
})

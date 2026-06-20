import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const { message } = await readBody(event)
  if (!message?.trim()) throw createError({ statusCode: 400, message: 'Message required' })

  const [r] = await db.execute(
    'INSERT INTO task_comments (task_id, user_id, message) VALUES (?, ?, ?)',
    [id, user.id, message.trim()]
  ) as [ResultSetHeader, any]

  await logActivity(db, {
    entity_type: 'task',
    entity_id: Number(id),
    action: 'commented',
    label: `${user.name} menambahkan komentar`,
    user_id: user.id,
  })

  const [rows] = await db.execute(
    `SELECT tc.*, u.name as user_name, u.role as user_role
     FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id
     WHERE tc.id = ?`,
    [r.insertId]
  )
  return { data: (rows as any[])[0] }
})

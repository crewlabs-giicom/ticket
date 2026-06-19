import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const body = await readBody(event)

  const { project_id, title, description, assigned_to, status = 'backlog' } = body
  const due_date = body.due_date ? String(body.due_date).slice(0, 10) : null
  if (!project_id || !title) throw createError({ statusCode: 400, message: 'project_id and title required' })

  // Get max position in this column
  const [posRows] = await db.execute(
    'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE project_id = ? AND status = ?',
    [project_id, status]
  ) as any[]
  const position = posRows[0]?.next_pos ?? 0

  const [result] = await db.execute(
    `INSERT INTO tasks (project_id, title, description, status, position, assigned_to, created_by, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [project_id, title, description || null, status, position, assigned_to || null, user.id, due_date || null]
  ) as any[]

  const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId])
  return (rows as any[])[0]
})

import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const body = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!body.project_id) throw createError({ statusCode: 400, statusMessage: 'project_id is required' })

  const urgency = ['low', 'medium', 'high'].includes(body.urgency) ? body.urgency : 'medium'

  const [result] = await db.execute(
    `INSERT INTO requests (title, description, requester_id, project_id, urgency, status)
     VALUES (?, ?, ?, ?, ?, 'under_review')`,
    [body.title.trim(), body.description || null, user.id, Number(body.project_id), urgency]
  ) as any[]

  const [[row]] = await db.execute(
    `SELECT r.*, u.name as requester_name, p.name as project_name
     FROM requests r
     LEFT JOIN users u ON u.id = r.requester_id
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE r.id = ?`,
    [result.insertId]
  ) as any[]

  return row
})

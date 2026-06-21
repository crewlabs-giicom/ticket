import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const { filename, original_name, mime_type, size } = await readBody(event)

  if (!filename || !original_name) throw createError({ statusCode: 400, statusMessage: 'filename and original_name required' })

  await db.execute(
    'INSERT INTO task_attachments (task_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?,?,?,?,?,?)',
    [id, filename, original_name, mime_type || null, size || null, user.id]
  )

  return { success: true }
})

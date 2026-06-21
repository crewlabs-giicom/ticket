import { getDb } from '../../../../database/index'
import { requireAuth } from '../../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  const db = getDb()
  const taskId = getRouterParam(event, 'id')
  const attachId = getRouterParam(event, 'attachId')

  const [rows] = await db.execute(
    'SELECT * FROM task_attachments WHERE id=? AND task_id=?',
    [attachId, taskId]
  )
  const attach = (rows as any[])[0]
  if (!attach) throw createError({ statusCode: 404, statusMessage: 'Attachment not found' })

  // Only uploader or admin can delete
  if (user.role === 'staff' && attach.uploaded_by !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await db.execute('DELETE FROM task_attachments WHERE id=?', [attachId])
  return { success: true }
})

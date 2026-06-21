import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const { message, attachments } = await readBody(event)
  if (!message?.trim()) throw createError({ statusCode: 400, message: 'Message required' })

  const conn = await (db as any).getConnection()
  try {
    await conn.beginTransaction()

    const [r] = await conn.execute(
      'INSERT INTO task_comments (task_id, user_id, message) VALUES (?, ?, ?)',
      [id, user.id, message.trim()]
    ) as [ResultSetHeader, any]

    if (attachments?.length) {
      for (const a of attachments) {
        await conn.execute(
          'INSERT INTO task_attachments (task_id, task_comment_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?,?,?,?,?,?,?)',
          [id, r.insertId, a.filename, a.original_name, a.mime_type || null, a.size || null, user.id]
        )
      }
    }

    await conn.commit()

    await logActivity(db, {
      entity_type: 'task',
      entity_id: Number(id),
      action: 'commented',
      label: `${user.name} menambahkan komentar`,
      user_id: user.id,
    })

    const [rows] = await db.execute(
      `SELECT tc.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar
       FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id
       WHERE tc.id = ?`,
      [r.insertId]
    )
    const comment = (rows as any[])[0]

    if (attachments?.length) {
      const [attRows] = await db.execute(
        'SELECT * FROM task_attachments WHERE task_comment_id = ? ORDER BY created_at ASC',
        [r.insertId]
      )
      comment.attachments = attRows
    } else {
      comment.attachments = []
    }

    return { data: comment }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

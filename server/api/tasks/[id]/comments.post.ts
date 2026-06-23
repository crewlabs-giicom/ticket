import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'
import { broadcastToUser } from '../../../utils/sse'
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

    // Notifikasi komentar baru ke assignee + creator + participants (bukan commenter)
    const [taskRows] = await db.execute('SELECT title, assigned_to, created_by FROM tasks WHERE id=?', [id])
    const task = (taskRows as any[])[0]
    if (task) {
      const notifyIds = new Set<number>()
      if (task.assigned_to && Number(task.assigned_to) !== user.id) notifyIds.add(Number(task.assigned_to))
      if (task.created_by && Number(task.created_by) !== user.id) notifyIds.add(Number(task.created_by))
      try {
        const [parts] = await db.execute('SELECT user_id FROM task_participants WHERE task_id=?', [id])
        for (const p of parts as any[]) { if (Number(p.user_id) !== user.id) notifyIds.add(Number(p.user_id)) }
      } catch {}
      for (const uid of notifyIds) {
        await db.execute(
          'INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)',
          [uid, 'Komentar baru di task', `${user.name} berkomentar di "${task.title}"`, 'task_comment', id]
        )
        broadcastToUser(uid, 'notification', {
          title: 'Komentar baru di task',
          message: `${user.name}: "${task.title}"`,
          type: 'task_comment',
          task_id: Number(id),
        })
      }
    }

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

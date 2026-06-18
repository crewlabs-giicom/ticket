import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [notifs] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [user.id]
    )
    const [unreadRows] = await db.execute(
      'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
      [user.id]
    )
    const unread = (unreadRows as any[])[0].c
    return { success: true, data: notifs, unread }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (body.mark_all) {
      await db.execute('UPDATE notifications SET is_read=1 WHERE user_id=?', [user.id])
    } else if (body.id) {
      await db.execute('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [body.id, user.id])
    }
    return { success: true }
  }
})

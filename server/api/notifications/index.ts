import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id)
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as any
    return { success: true, data: notifs, unread: unread.c }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (body.mark_all) {
      db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(user.id)
    } else if (body.id) {
      db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(body.id, user.id)
    }
    return { success: true }
  }
})

import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const query = getQuery(event)

    if (query.full) {
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 20, 100)
      const offset = (page - 1) * limit
      let where = 'user_id = ?'
      const params: any[] = [user.id]
      if (query.search) {
        where += ' AND (title LIKE ? OR message LIKE ?)'
        params.push(`%${query.search}%`, `%${query.search}%`)
      }
      const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) as total FROM notifications WHERE ${where}`, params
      ) as any[]
      const [notifs] = await db.execute(
        `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
      return { success: true, data: notifs, total, page, limit, totalPages: Math.ceil(total / limit) }
    }

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

import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [rows] = await db.execute(
      'SELECT path, label, icon FROM user_pinned_pages WHERE user_id = ? ORDER BY created_at ASC',
      [user.id]
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { path, label, icon } = body
    if (!path) throw createError({ statusCode: 400, statusMessage: 'path required' })
    await db.execute(
      'INSERT INTO user_pinned_pages (user_id, path, label, icon) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE label=VALUES(label), icon=VALUES(icon)',
      [user.id, path, label || '', icon || 'grid']
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    const body = await readBody(event)
    const { path } = body
    if (!path) throw createError({ statusCode: 400, statusMessage: 'path required' })
    await db.execute(
      'DELETE FROM user_pinned_pages WHERE user_id = ? AND path = ?',
      [user.id, path]
    )
    return { success: true }
  }
})

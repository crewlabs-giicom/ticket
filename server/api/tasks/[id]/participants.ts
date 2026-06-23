import { getDb } from '../../../database/index'
import { broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(`
      SELECT tp.user_id, tp.invited_by, tp.created_at,
        u.name, u.email, u.role, u.avatar,
        inv.name as invited_by_name
      FROM task_participants tp
      LEFT JOIN users u ON u.id = tp.user_id
      LEFT JOIN users inv ON inv.id = tp.invited_by
      WHERE tp.task_id = ?
      ORDER BY tp.created_at ASC
    `, [id])
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })

    const [taskRows] = await db.execute('SELECT id, title FROM tasks WHERE id=?', [id])
    const task = (taskRows as any[])[0]
    if (!task) throw createError({ statusCode: 404, statusMessage: 'Task tidak ditemukan' })

    try {
      await db.execute(
        'INSERT INTO task_participants (task_id, user_id, invited_by) VALUES (?, ?, ?)',
        [id, user_id, user.id]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 409, statusMessage: 'User sudah menjadi peserta' })
      throw e
    }

    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, 'Diundang ke task', `${user.name} mengundang Anda ke task: ${task.title}`, 'task_invite', id]
    )
    broadcastToUser(user_id, 'notification', {
      title: 'Diundang ke task',
      message: `${user.name} mengundang Anda ke task: ${task.title}`,
      type: 'task_invite',
      task_id: Number(id),
    })

    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })

    await db.execute('DELETE FROM task_participants WHERE task_id=? AND user_id=?', [id, user_id])
    return { success: true }
  }
})

import { getDb } from '../../../database/index'
import { requireAuth } from '../../../utils/rbac'
import { broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(`
      SELECT pp.user_id, pp.invited_by, pp.created_at,
        u.name, u.email, u.role, u.avatar,
        inv.name as invited_by_name
      FROM prd_participants pp
      LEFT JOIN users u ON u.id = pp.user_id
      LEFT JOIN users inv ON inv.id = pp.invited_by
      WHERE pp.prd_id = ?
      ORDER BY pp.created_at ASC
    `, [id])
    return { success: true, data: rows }
  }

  if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })

    const [[prd]] = await db.execute('SELECT id, title FROM prds WHERE id=?', [id]) as any[]
    if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD tidak ditemukan' })

    try {
      await db.execute(
        'INSERT INTO prd_participants (prd_id, user_id, invited_by) VALUES (?, ?, ?)',
        [id, user_id, user.id]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 409, statusMessage: 'User sudah menjadi peserta' })
      throw e
    }

    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [user_id, 'Diundang ke PRD', `${user.name} mengundang Anda ke PRD: ${prd.title}`, 'prd_invite']
    )
    broadcastToUser(Number(user_id), 'notification', {
      title: 'Diundang ke PRD',
      message: `${user.name} mengundang Anda ke PRD: ${prd.title}`,
      type: 'prd_invite',
    })

    return { success: true }
  }

  if (event.method === 'DELETE') {
    const body = await readBody(event)
    const { user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id diperlukan' })
    await db.execute('DELETE FROM prd_participants WHERE prd_id=? AND user_id=?', [id, user_id])
    return { success: true }
  }
})

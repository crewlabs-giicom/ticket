import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[row]] = await db.execute('SELECT * FROM requests WHERE id=?', [id]) as any[]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Request tidak ditemukan' })

  // Customer hanya bisa edit milik sendiri
  if (user.role === 'customer' && row.requester_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Tidak bisa edit kalau sudah rejected, standalone, atau sudah masuk PRD
  if (row.status === 'rejected' || row.status === 'standalone' || row.prd_id) {
    throw createError({ statusCode: 422, statusMessage: 'Request tidak dapat diedit pada status ini' })
  }

  const body = await readBody(event)
  const { title, description, urgency, project_id } = body

  await db.execute(
    `UPDATE requests SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      urgency = COALESCE(?, urgency),
      project_id = COALESCE(?, project_id),
      updated_at = NOW()
     WHERE id = ?`,
    [title ?? null, description ?? null, urgency ?? null, project_id ?? null, id]
  )

  return { success: true }
})

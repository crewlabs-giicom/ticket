import { getDb } from '../../database/index'
import { requireInfraAdmin } from '../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nama ruangan wajib diisi' })
    await db.execute(
      'UPDATE rooms SET name=?, location=?, description=?, is_active=? WHERE id=?',
      [body.name.trim(), body.location || null, body.description || null, body.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM rooms WHERE id = ?', [id])
    return { success: true }
  }
})

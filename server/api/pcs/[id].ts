import { getDb } from '../../database/index'
import { requireInfraAdmin } from '../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'PUT') {
    const b = await readBody(event)
    if (!b?.room_id || !b?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Ruangan dan nama PC wajib diisi' })
    await db.execute(
      'UPDATE pc_assets SET room_id=?, name=?, description=?, is_active=? WHERE id=?',
      [Number(b.room_id), b.name.trim(), b.description || null, b.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM pc_assets WHERE id = ?', [id])
    return { success: true }
  }
})

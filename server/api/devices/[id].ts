import { getDb } from '../../database/index'
import { requireInfraAdmin } from '../../utils/infra'

const TYPES = ['ap', 'switch', 'router', 'other']

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'PUT') {
    const b = await readBody(event)
    if (!b?.room_id || !b?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Ruangan dan nama wajib diisi' })
    await db.execute(
      'UPDATE network_devices SET room_id=?, name=?, type=?, ip_address=?, mac_address=?, brand_model=?, is_active=? WHERE id=?',
      [Number(b.room_id), b.name.trim(), TYPES.includes(b.type) ? b.type : 'ap', b.ip_address || null, b.mac_address || null, b.brand_model || null, b.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM network_devices WHERE id = ?', [id])
    return { success: true }
  }
})

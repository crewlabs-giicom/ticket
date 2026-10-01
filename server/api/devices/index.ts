import { getDb } from '../../database/index'
import { requireInfraUser, requireInfraAdmin } from '../../utils/infra'
import type { ResultSetHeader } from 'mysql2'

const TYPES = ['ap', 'switch', 'router', 'other']

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireInfraUser(event)
    const q = getQuery(event)
    const where = q.room_id ? 'WHERE d.room_id = ?' : ''
    const [rows] = await db.execute(
      `SELECT d.*, r.name AS room_name FROM network_devices d JOIN rooms r ON r.id = d.room_id ${where} ORDER BY r.name ASC, d.name ASC`,
      q.room_id ? [Number(q.room_id)] : []
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    requireInfraAdmin(event)
    const b = await readBody(event)
    if (!b?.room_id || !b?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Ruangan dan nama wajib diisi' })
    const [r] = await db.execute(
      'INSERT INTO network_devices (room_id, name, type, ip_address, mac_address, brand_model) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(b.room_id), b.name.trim(), TYPES.includes(b.type) ? b.type : 'ap', b.ip_address || null, b.mac_address || null, b.brand_model || null]
    )
    const [rows] = await db.execute('SELECT * FROM network_devices WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

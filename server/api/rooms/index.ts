import { getDb } from '../../database/index'
import { requireInfraUser, requireInfraAdmin } from '../../utils/infra'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireInfraUser(event)
    const [rows] = await db.execute(
      `SELECT r.*,
        (SELECT COUNT(*) FROM network_devices d WHERE d.room_id = r.id AND d.is_active = 1) AS device_count,
        (SELECT COUNT(*) FROM pc_assets p WHERE p.room_id = r.id AND p.is_active = 1) AS pc_count
       FROM rooms r ORDER BY r.name ASC`
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    requireInfraAdmin(event)
    const body = await readBody(event)
    if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Nama ruangan wajib diisi' })
    const [r] = await db.execute(
      'INSERT INTO rooms (name, location, description) VALUES (?, ?, ?)',
      [body.name.trim(), body.location || null, body.description || null]
    )
    const [rows] = await db.execute('SELECT * FROM rooms WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

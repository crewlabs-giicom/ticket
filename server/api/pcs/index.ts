import { getDb } from '../../database/index'
import { requireInfraUser, requireInfraAdmin } from '../../utils/infra'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireInfraUser(event)
    const q = getQuery(event)
    const where = q.room_id ? 'WHERE p.room_id = ?' : ''
    const [rows] = await db.execute(
      `SELECT p.*, r.name AS room_name FROM pc_assets p JOIN rooms r ON r.id = p.room_id ${where} ORDER BY r.name ASC, p.name ASC`,
      q.room_id ? [Number(q.room_id)] : []
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    requireInfraAdmin(event)
    const b = await readBody(event)
    if (!b?.room_id || !b?.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Ruangan dan nama PC wajib diisi' })
    const [r] = await db.execute(
      'INSERT INTO pc_assets (room_id, name, description) VALUES (?, ?, ?)',
      [Number(b.room_id), b.name.trim(), b.description || null]
    )
    const [rows] = await db.execute('SELECT * FROM pc_assets WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

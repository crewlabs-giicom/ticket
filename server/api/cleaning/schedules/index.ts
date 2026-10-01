import { getDb } from '../../../database/index'
import { requireInfraUser, requireInfraAdmin } from '../../../utils/infra'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireInfraUser(event)
    const q = getQuery(event)
    const cond: string[] = []
    const params: any[] = []
    if (q.room_id) { cond.push('s.room_id = ?'); params.push(Number(q.room_id)) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
    const [rows] = await db.execute(
      `SELECT s.*, r.name AS room_name, p.name AS pc_name, u.name AS assigned_name,
        DATEDIFF(s.next_due_date, CURDATE()) AS days_left,
        (SELECT MAX(l.cleaned_at) FROM cleaning_logs l WHERE l.schedule_id = s.id) AS last_cleaned_at
       FROM cleaning_schedules s
       JOIN rooms r ON r.id = s.room_id
       LEFT JOIN pc_assets p ON p.id = s.pc_id
       LEFT JOIN users u ON u.id = s.assigned_to
       ${where} ORDER BY s.is_active DESC, s.next_due_date ASC`,
      params
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    requireInfraAdmin(event)
    const b = await readBody(event)
    if (!b?.room_id || !b?.title?.trim() || !b?.next_due_date) throw createError({ statusCode: 400, statusMessage: 'Ruangan, judul, dan tanggal jatuh tempo wajib diisi' })
    const freq = Math.max(Number(b.frequency_days) || 30, 1)
    const [r] = await db.execute(
      'INSERT INTO cleaning_schedules (room_id, pc_id, title, frequency_days, next_due_date, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(b.room_id), b.pc_id ? Number(b.pc_id) : null, b.title.trim(), freq, b.next_due_date, b.assigned_to ? Number(b.assigned_to) : null]
    )
    const [rows] = await db.execute('SELECT * FROM cleaning_schedules WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

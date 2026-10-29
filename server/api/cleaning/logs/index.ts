import { getDb } from '../../../database/index'
import { requireInfraUser } from '../../../utils/infra'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireInfraUser(event)
  const db = getDb()

  if (event.method === 'GET') {
    const q = getQuery(event)
    const limit = Math.min(Number(q.limit) || 20, 500)
    const page = Math.max(Number(q.page) || 1, 1)
    const cond: string[] = []
    const params: any[] = []
    if (q.room_id) { cond.push('l.room_id = ?'); params.push(Number(q.room_id)) }
    if (q.pc_id) { cond.push('l.pc_id = ?'); params.push(Number(q.pc_id)) }
    if (q.from) { cond.push('l.cleaned_at >= ?'); params.push(`${q.from} 00:00:00`) }
    if (q.to) { cond.push('l.cleaned_at <= ?'); params.push(`${q.to} 23:59:59`) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM cleaning_logs l ${where}`, params) as any[]
    const [rows] = await db.execute(
      `SELECT l.*, r.name AS room_name, p.name AS pc_name, p.arf_number, p.owner_name, s.title AS schedule_title, u.name AS cleaned_by_name
       FROM cleaning_logs l
       JOIN rooms r ON r.id = l.room_id
       LEFT JOIN pc_assets p ON p.id = l.pc_id
       LEFT JOIN cleaning_schedules s ON s.id = l.schedule_id
       LEFT JOIN users u ON u.id = l.cleaned_by
       ${where} ORDER BY l.cleaned_at DESC, l.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    )
    // foto per log: satu query untuk seluruh halaman
    const logRows = rows as any[]
    const photosByLog = new Map<number, any[]>()
    if (logRows.length) {
      const [photos] = await db.query(
        'SELECT id, log_id, filename, original_name FROM cleaning_log_photos WHERE log_id IN (?) ORDER BY id ASC',
        [logRows.map(l => l.id)]
      ) as any[]
      for (const ph of photos as any[]) {
        if (!photosByLog.has(ph.log_id)) photosByLog.set(ph.log_id, [])
        photosByLog.get(ph.log_id)!.push(ph)
      }
    }
    for (const l of logRows) l.photos = photosByLog.get(l.id) || []
    return { success: true, data: logRows, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // POST: catat pembersihan per PC (dari jadwal, atau ad-hoc tanpa jadwal). Satu submit = satu log per PC,
  // masing-masing dengan foto PC-nya sendiri, sehingga tiap PC punya riwayat pembersihan.
  if (event.method === 'POST') {
    const b = await readBody(event)
    let roomId = b?.room_id ? Number(b.room_id) : null
    const scheduleId = b?.schedule_id ? Number(b.schedule_id) : null
    let schedulePcId: number | null = null

    if (scheduleId) {
      const [srows] = await db.execute('SELECT room_id, pc_id FROM cleaning_schedules WHERE id = ?', [scheduleId])
      const s = (srows as any[])[0]
      if (!s) throw createError({ statusCode: 404, statusMessage: 'Jadwal tidak ditemukan' })
      roomId = s.room_id
      schedulePcId = s.pc_id
    }
    if (!roomId) throw createError({ statusCode: 400, statusMessage: 'Ruangan wajib dipilih' })

    // item per PC; foto hanya gambar, maksimal 10 per PC (PC yang sama digabung)
    const items: any[] = Array.isArray(b?.items) ? b.items : []
    const photosByPc = new Map<number, any[]>()
    for (const it of items) {
      const pcId = Number(it?.pc_id)
      if (!pcId) continue
      const photos = (Array.isArray(it.photos) ? it.photos : [])
        .filter((p: any) => p?.filename && p?.original_name && String(p.mime_type || '').startsWith('image/'))
      photosByPc.set(pcId, [...(photosByPc.get(pcId) || []), ...photos].slice(0, 10))
    }
    if (!photosByPc.size) throw createError({ statusCode: 400, statusMessage: 'Pilih minimal satu PC' })
    if (schedulePcId && [...photosByPc.keys()].some(id => id !== schedulePcId)) {
      throw createError({ statusCode: 400, statusMessage: 'PC tidak sesuai dengan jadwal' })
    }

    // semua PC harus aktif dan milik ruangan ini
    const [pcRows] = await db.query(
      'SELECT id, name FROM pc_assets WHERE room_id = ? AND is_active = 1 AND id IN (?)',
      [roomId, [...photosByPc.keys()]]
    ) as any[]
    const pcName = new Map<number, string>((pcRows as any[]).map(p => [p.id, p.name]))
    for (const [pcId, photos] of photosByPc) {
      if (!pcName.has(pcId)) throw createError({ statusCode: 400, statusMessage: 'PC tidak valid untuk ruangan ini' })
      if (!photos.length) throw createError({ statusCode: 400, statusMessage: `PC ${pcName.get(pcId)} wajib ada foto` })
    }

    const tasksDone = Array.isArray(b.tasks_done) ? b.tasks_done.join(', ') : (b.tasks_done || null)
    const conn = await db.getConnection()
    const ids: number[] = []
    try {
      await conn.beginTransaction()
      for (const [pcId, photos] of photosByPc) {
        const [r] = await conn.execute(
          'INSERT INTO cleaning_logs (schedule_id, room_id, pc_id, cleaned_by, tasks_done, note) VALUES (?, ?, ?, ?, ?, ?)',
          [scheduleId, roomId, pcId, user.id, tasksDone, b.note || null]
        )
        const logId = (r as ResultSetHeader).insertId
        ids.push(logId)
        for (const p of photos) {
          await conn.execute(
            'INSERT INTO cleaning_log_photos (log_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
            [logId, p.filename, p.original_name, p.mime_type, p.size || null, user.id]
          )
        }
      }
      if (scheduleId) {
        await conn.execute(
          'UPDATE cleaning_schedules SET next_due_date = DATE_ADD(CURDATE(), INTERVAL frequency_days DAY), last_notified_date = NULL WHERE id = ?',
          [scheduleId]
        )
      }
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
    return { success: true, ids }
  }
})

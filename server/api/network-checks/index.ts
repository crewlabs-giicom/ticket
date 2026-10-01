import { getDb } from '../../database/index'
import { requireInfraUser, computeNetworkStatus, toNum } from '../../utils/infra'
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
    if (q.room_id) { cond.push('nc.room_id = ?'); params.push(Number(q.room_id)) }
    if (q.device_id) { cond.push('nc.device_id = ?'); params.push(Number(q.device_id)) }
    if (q.from) { cond.push('nc.checked_at >= ?'); params.push(`${q.from} 00:00:00`) }
    if (q.to) { cond.push('nc.checked_at <= ?'); params.push(`${q.to} 23:59:59`) }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM network_checks nc ${where}`, params) as any[]
    const [rows] = await db.execute(
      `SELECT nc.*, r.name AS room_name, d.name AS device_name, u.name AS checked_by_name
       FROM network_checks nc
       JOIN rooms r ON r.id = nc.room_id
       LEFT JOIN network_devices d ON d.id = nc.device_id
       LEFT JOIN users u ON u.id = nc.checked_by
       ${where} ORDER BY nc.checked_at DESC, nc.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    )
    return { success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  if (event.method === 'POST') {
    const b = await readBody(event)
    if (!b?.room_id) throw createError({ statusCode: 400, statusMessage: 'Ruangan wajib dipilih' })
    const m = {
      download_mbps: toNum(b.download_mbps), upload_mbps: toNum(b.upload_mbps),
      latency_ms: toNum(b.latency_ms), jitter_ms: toNum(b.jitter_ms),
      download_jitter_ms: toNum(b.download_jitter_ms), upload_jitter_ms: toNum(b.upload_jitter_ms),
      packet_loss_pct: toNum(b.packet_loss_pct),
    }
    if (Object.values(m).every(v => v === null)) throw createError({ statusCode: 400, statusMessage: 'Minimal satu hasil pengukuran harus diisi' })
    const status = computeNetworkStatus(m)
    const [r] = await db.execute(
      `INSERT INTO network_checks
        (room_id, device_id, checked_by, source, download_mbps, upload_mbps, latency_ms, jitter_ms, download_jitter_ms, upload_jitter_ms,
         packet_loss_pct, duration_sec, connected_clients, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(b.room_id), b.device_id ? Number(b.device_id) : null, user.id, b.source === 'manual' ? 'manual' : 'browser',
        m.download_mbps, m.upload_mbps, m.latency_ms, m.jitter_ms, m.download_jitter_ms, m.upload_jitter_ms,
        m.packet_loss_pct, toNum(b.duration_sec), toNum(b.connected_clients), status, b.note || null,
      ]
    )
    const [rows] = await db.execute('SELECT * FROM network_checks WHERE id = ?', [(r as ResultSetHeader).insertId])
    return { success: true, data: (rows as any[])[0] }
  }
})

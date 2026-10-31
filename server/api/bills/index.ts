import { getDb } from '../../database/index'
import { requireBillUser, requireBillAdmin, parseBillBody } from '../../utils/bills'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireBillUser(event)
    const q = getQuery(event)
    const limit = Math.min(Number(q.limit) || 20, 500)
    const page = Math.max(Number(q.page) || 1, 1)
    const cond: string[] = []
    const params: any[] = []
    if (q.type) { cond.push('b.type = ?'); params.push(String(q.type)) }
    if (q.q) { cond.push('(b.provider LIKE ? OR b.title LIKE ? OR b.type_other LIKE ?)'); params.push(...Array(3).fill(`%${q.q}%`)) }
    const status = String(q.status || '')
    if (status === 'overdue') cond.push('b.is_active = 1 AND b.due_date < CURDATE()')
    else if (status === 'soon') cond.push('b.is_active = 1 AND b.due_date >= CURDATE() AND DATEDIFF(b.due_date, CURDATE()) <= b.remind_days')
    else if (status === 'ok') cond.push('b.is_active = 1 AND DATEDIFF(b.due_date, CURDATE()) > b.remind_days')
    else if (status === 'inactive') cond.push('b.is_active = 0')
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM bills b ${where}`, params) as any[]
    const [rows] = await db.execute(
      `SELECT b.*, DATEDIFF(b.due_date, CURDATE()) AS days_left,
              (SELECT MAX(p.paid_at) FROM bill_payments p WHERE p.bill_id = b.id) AS last_paid_at
       FROM bills b ${where}
       ORDER BY b.is_active DESC, b.due_date ASC, b.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    )
    // ringkasan seluruh tagihan aktif (tidak terpengaruh filter)
    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS total_active,
              COALESCE(SUM(due_date < CURDATE()), 0) AS overdue,
              COALESCE(SUM(due_date >= CURDATE() AND DATEDIFF(due_date, CURDATE()) <= remind_days), 0) AS soon
       FROM bills WHERE is_active = 1`
    ) as any[]
    return {
      success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit),
      summary: { total_active: Number(summary.total_active), overdue: Number(summary.overdue), soon: Number(summary.soon) },
    }
  }

  if (event.method === 'POST') {
    const user = requireBillAdmin(event)
    const b = parseBillBody(await readBody(event))
    const [r] = await db.execute(
      `INSERT INTO bills (provider, type, type_other, title, amount, billing_cycle, due_date, remind_days, notes, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.provider, b.type, b.type_other, b.title, b.amount, b.billing_cycle, b.due_date, b.remind_days, b.notes, b.is_active, user.id]
    )
    return { success: true, id: (r as ResultSetHeader).insertId }
  }
})

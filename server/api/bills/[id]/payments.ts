import { getDb } from '../../../database/index'
import { requireBillUser, calcNextDue, isDate } from '../../../utils/bills'
import { todayWIB } from '../../../utils/date'
import type { ResultSetHeader } from 'mysql2'

export default defineEventHandler(async (event) => {
  const user = requireBillUser(event)
  const db = getDb()
  const billId = Number(getRouterParam(event, 'id'))

  if (event.method === 'GET') {
    const q = getQuery(event)
    const limit = Math.min(Number(q.limit) || 10, 200)
    const page = Math.max(Number(q.page) || 1, 1)
    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM bill_payments WHERE bill_id = ?', [billId]) as any[]
    const [rows] = await db.execute(
      `SELECT p.*, u.name AS paid_by_name FROM bill_payments p LEFT JOIN users u ON u.id = p.paid_by
       WHERE p.bill_id = ? ORDER BY p.paid_at DESC, p.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [billId]
    )
    return { success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  if (event.method === 'POST') {
    const b = await readBody(event)
    const paidAt = b?.paid_at ? String(b.paid_at) : todayWIB()
    if (!isDate(paidAt)) throw createError({ statusCode: 400, statusMessage: 'Tanggal bayar tidak valid' })
    const amountPaid = b?.amount_paid === '' || b?.amount_paid == null ? null : Number(b.amount_paid)
    if (amountPaid !== null && (Number.isNaN(amountPaid) || amountPaid < 0)) throw createError({ statusCode: 400, statusMessage: 'Nominal tidak valid' })

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()
      const [brows] = await conn.execute('SELECT id, due_date, billing_cycle FROM bills WHERE id = ? FOR UPDATE', [billId]) as any[]
      const bill = (brows as any[])[0]
      if (!bill) throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan' })

      const prevDue = String(bill.due_date).slice(0, 10)
      const newDue = b?.new_due_date ? String(b.new_due_date) : calcNextDue(prevDue, bill.billing_cycle)
      if (!isDate(newDue)) throw createError({ statusCode: 400, statusMessage: 'Jatuh tempo baru tidak valid' })

      const proof = b?.proof?.filename ? b.proof : null
      const [r] = await conn.execute(
        `INSERT INTO bill_payments (bill_id, paid_at, amount_paid, previous_due_date, new_due_date,
           proof_filename, proof_original_name, proof_mime_type, proof_size, note, paid_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [billId, paidAt, amountPaid, prevDue, newDue, proof?.filename || null, proof?.original_name || null,
          proof?.mime_type || null, proof?.size || null, String(b?.note || '').trim() || null, user.id]
      )
      // siklus 'once' (sekali bayar) otomatis nonaktif setelah dibayar
      await conn.execute(
        `UPDATE bills SET due_date = ?, last_notified_date = NULL, last_notified_stage = NULL,
                is_active = IF(billing_cycle = 'once', 0, is_active) WHERE id = ?`,
        [newDue, billId]
      )
      await conn.commit()
      return { success: true, id: (r as ResultSetHeader).insertId, new_due_date: newDue }
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }
})

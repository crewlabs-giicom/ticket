import { getDb } from '../../database/index'
import { requireBillAdmin } from '../../utils/bills'

// Hapus pembayaran. Bila ini pembayaran terbaru tagihannya, jatuh tempo dikembalikan ke nilai sebelum dibayar.
export default defineEventHandler(async (event) => {
  requireBillAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [prows] = await conn.execute('SELECT * FROM bill_payments WHERE id = ? FOR UPDATE', [id]) as any[]
    const pay = (prows as any[])[0]
    if (!pay) throw createError({ statusCode: 404, statusMessage: 'Pembayaran tidak ditemukan' })

    const [[latest]] = await conn.execute(
      'SELECT id FROM bill_payments WHERE bill_id = ? ORDER BY paid_at DESC, id DESC LIMIT 1', [pay.bill_id]
    ) as any[]
    await conn.execute('DELETE FROM bill_payments WHERE id = ?', [id])
    if (latest?.id === id) {
      await conn.execute(
        'UPDATE bills SET due_date = ?, is_active = 1, last_notified_date = NULL, last_notified_stage = NULL WHERE id = ?',
        [String(pay.previous_due_date).slice(0, 10), pay.bill_id]
      )
    }
    await conn.commit()
    return { success: true }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})

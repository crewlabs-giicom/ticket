import { getDb } from '../../database/index'
import { requireBillAdmin, parseBillBody } from '../../utils/bills'

export default defineEventHandler(async (event) => {
  requireBillAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'PUT') {
    const b = parseBillBody(await readBody(event))
    // jatuh tempo/periode berubah -> reset status pengingat agar notifikasi dihitung ulang
    const [r] = await db.execute(
      `UPDATE bills SET provider=?, type=?, type_other=?, title=?, amount=?, billing_cycle=?, due_date=?, remind_days=?, notes=?, is_active=?,
              last_notified_date = IF(due_date <> ?, NULL, last_notified_date),
              last_notified_stage = IF(due_date <> ?, NULL, last_notified_stage)
       WHERE id=?`,
      [b.provider, b.type, b.type_other, b.title, b.amount, b.billing_cycle, b.due_date, b.remind_days, b.notes, b.is_active, b.due_date, b.due_date, id]
    ) as any[]
    if (!r.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan' })
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM bills WHERE id = ?', [id])
    return { success: true }
  }
})

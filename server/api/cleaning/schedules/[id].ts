import { getDb } from '../../../database/index'
import { requireInfraAdmin } from '../../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'PUT') {
    const b = await readBody(event)
    if (!b?.room_id || !b?.title?.trim() || !b?.next_due_date) throw createError({ statusCode: 400, statusMessage: 'Ruangan, judul, dan tanggal jatuh tempo wajib diisi' })
    await db.execute(
      'UPDATE cleaning_schedules SET room_id=?, pc_id=?, title=?, frequency_days=?, next_due_date=?, assigned_to=?, is_active=? WHERE id=?',
      [Number(b.room_id), b.pc_id ? Number(b.pc_id) : null, b.title.trim(), Math.max(Number(b.frequency_days) || 30, 1), b.next_due_date, b.assigned_to ? Number(b.assigned_to) : null, b.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM cleaning_schedules WHERE id = ?', [id])
    return { success: true }
  }
})

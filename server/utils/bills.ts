import type { H3Event } from 'h3'
import { requireRole } from './rbac'
import { BILL_CYCLES, BILL_TYPES } from '../../utils/billCycle'

export { calcNextDue, billStage } from '../../utils/billCycle'

/** Admin & staff boleh melihat tagihan dan mencatat pembayaran. */
export function requireBillUser(event: H3Event) {
  return requireRole(event, ['admin', 'staff'])
}

/** Hanya admin yang boleh menambah/ubah/hapus tagihan. */
export function requireBillAdmin(event: H3Event) {
  return requireRole(event, ['admin'])
}

const isDate = (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))

/** Validasi & normalisasi body tagihan (POST/PUT). */
export function parseBillBody(b: any) {
  const provider = String(b?.provider || '').trim()
  const type = String(b?.type || '')
  const typeOther = String(b?.type_other || '').trim()
  const cycle = String(b?.billing_cycle || 'monthly')
  if (!provider) throw createError({ statusCode: 400, statusMessage: 'Provider wajib diisi' })
  if (!(BILL_TYPES as readonly string[]).includes(type)) throw createError({ statusCode: 400, statusMessage: 'Jenis tagihan tidak valid' })
  if (type === 'lainnya' && !typeOther) throw createError({ statusCode: 400, statusMessage: 'Jenis lainnya wajib diisi manual' })
  if (!(BILL_CYCLES as readonly string[]).includes(cycle)) throw createError({ statusCode: 400, statusMessage: 'Siklus tidak valid' })
  if (!isDate(b?.due_date)) throw createError({ statusCode: 400, statusMessage: 'Tanggal jatuh tempo wajib diisi' })
  const amount = b?.amount === '' || b?.amount == null ? null : Number(b.amount)
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) throw createError({ statusCode: 400, statusMessage: 'Nominal tidak valid' })
  return {
    provider,
    type,
    type_other: type === 'lainnya' ? typeOther : null,
    title: String(b?.title || '').trim() || null,
    amount,
    billing_cycle: cycle,
    due_date: String(b.due_date),
    remind_days: Math.min(Math.max(Number(b?.remind_days) || 7, 1), 90),
    notes: String(b?.notes || '').trim() || null,
    is_active: b?.is_active === 0 || b?.is_active === false ? 0 : 1,
  }
}

export { isDate }

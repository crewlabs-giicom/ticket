export const BILL_CYCLES = ['monthly', 'quarterly', 'semiannual', 'yearly', 'once'] as const
export type BillCycle = typeof BILL_CYCLES[number]

export const BILL_TYPES = ['internet', 'hosting', 'domain', 'lainnya'] as const

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 }

/**
 * Tambah bulan ke tanggal YYYY-MM-DD. Jika hari asal tidak ada di bulan tujuan (mis. 31 Jan + 1 bln),
 * dipakai hari terakhir bulan tujuan.
 * Siklus 'once' / tak dikenal mengembalikan tanggal semula.
 */
export function calcNextDue(due: string, cycle: string): string {
  const months = CYCLE_MONTHS[cycle]
  const [y, m, d] = String(due).slice(0, 10).split('-').map(Number)
  if (!months || !y || !m || !d) return String(due).slice(0, 10)
  const total = (m - 1) + months
  const ny = y + Math.floor(total / 12)
  const nm = total % 12
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

export type BillStage = 'over' | 'd0' | 'd1' | 'd3' | 'early' | null

/** Tahap pengingat berdasarkan sisa hari; null bila belum waktunya mengingatkan. */
export function billStage(daysLeft: number, remindDays: number): BillStage {
  if (daysLeft < 0) return 'over'
  if (daysLeft === 0) return 'd0'
  if (daysLeft <= 1) return 'd1'
  if (daysLeft <= 3) return 'd3'
  if (daysLeft <= remindDays) return 'early'
  return null
}

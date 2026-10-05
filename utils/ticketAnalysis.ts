export interface TicketActivityAnalysis { key: string; params: Record<string, string | number> }

/**
 * Analisa singkat untuk entri activity bertipe status.
 * `history` berurutan terbaru → terlama (sesuai API); `index` = posisi entri.
 * Mengembalikan kunci i18n `tickets.activity.analysis.<key>` atau null bila tidak ada analisa.
 */
export function explainTicketActivity(history: any[], index: number): TicketActivityAnalysis | null {
  const h = history[index]
  if (!h) return null
  const user = h.user_name || 'System'
  const prev = history[index + 1] // entri sebelumnya secara waktu
  const ms = prev ? Math.max(0, new Date(String(h.created_at).replace(' ', 'T') + '+07:00').getTime() - new Date(String(prev.created_at).replace(' ', 'T') + '+07:00').getTime()) : 0
  const hours = Math.round(ms / 3600000)
  const params = { user, hours }

  if (h.action === 'resolved') return { key: prev ? 'resolvedAfter' : 'resolved', params }
  if (h.action === 'status_bypassed_done') return { key: 'bypassed', params }
  if (h.action === 'qc_loop') return { key: 'qcLoop', params }
  if (h.action !== 'status_changed') return null

  if (/via balasan/i.test(h.label || '')) return { key: 'viaReply', params }
  const m = /dari "(.+?)" ke "(.+?)"/.exec(h.label || '')
  if (m && /reject|ditolak/i.test(m[2])) return { key: 'rejected', params: { ...params, to: m[2] } }
  if (prev?.action === 'assigned') return { key: 'afterAssign', params: { ...params, to: m?.[2] ?? '' } }
  if (prev?.action === 'commented') return { key: 'afterComment', params: { ...params, to: m?.[2] ?? '' } }
  return { key: 'manual', params: { ...params, to: m?.[2] ?? '' } }
}

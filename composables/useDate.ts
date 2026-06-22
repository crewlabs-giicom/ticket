/**
 * Parse a datetime string from the DB (stored in WIB, no timezone suffix)
 * by appending +07:00 so JS interprets it correctly regardless of browser timezone.
 */
function _parse(str: string): Date {
  if (/[TZ+\-]\d{2}:\d{2}$/.test(str) || str.endsWith('Z')) return new Date(str)
  // "2026-06-22 15:00:00" or "2026-06-22" → treat as WIB
  return new Date(str.replace(' ', 'T') + '+07:00')
}

const WIB = { timeZone: 'Asia/Jakarta' }

export function useDate() {
  /** "22 Jun 2026 15.00" */
  function fmtDateTime(str: string | null | undefined): string {
    if (!str) return '—'
    return _parse(str).toLocaleString('id-ID', WIB)
  }

  /** "22/6/2026" */
  function fmtDate(str: string | null | undefined): string {
    if (!str) return '—'
    return _parse(str).toLocaleDateString('id-ID', WIB)
  }

  /** "22 Jun" */
  function fmtShort(str: string | null | undefined): string {
    if (!str) return '—'
    return _parse(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...WIB })
  }

  /** true if the date has passed (compared to current WIB time) */
  function isOverdue(str: string | null | undefined): boolean {
    if (!str) return false
    return _parse(str) < new Date()
  }

  return { fmtDateTime, fmtDate, fmtShort, isOverdue }
}

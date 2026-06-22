export function useTimeAgo() {
  function timeAgo(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return ''
    let d: Date
    if (dateStr instanceof Date) {
      d = dateStr
    } else {
      // DB strings have no timezone suffix — treat as WIB (+07:00)
      const s = /[TZ+\-]\d{2}:\d{2}$/.test(dateStr) || dateStr.endsWith('Z')
        ? dateStr
        : dateStr.replace(' ', 'T') + '+07:00'
      d = new Date(s)
    }
    const diff = Date.now() - d.getTime()
    if (diff < 0) return 'baru saja'
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'baru saja'
    if (m < 60) return `${m}m lalu`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}j lalu`
    const dy = Math.floor(h / 24)
    if (dy < 30) return `${dy}h lalu`
    const mo = Math.floor(dy / 30)
    if (mo < 12) return `${mo}bln lalu`
    return `${Math.floor(mo / 12)}thn lalu`
  }
  return { timeAgo }
}

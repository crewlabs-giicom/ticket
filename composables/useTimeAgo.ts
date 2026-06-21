export function useTimeAgo() {
  function timeAgo(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    if (diff < 0) return 'baru saja'
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'baru saja'
    if (m < 60) return `${m}m lalu`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}j lalu`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}h lalu`
    const mo = Math.floor(d / 30)
    if (mo < 12) return `${mo}bln lalu`
    return `${Math.floor(mo / 12)}thn lalu`
  }
  return { timeAgo }
}

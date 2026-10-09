// Port server-side dari reportText di pages/reports/daily.vue (format pesan yang sama).

function parseWib(str: string): Date {
  if (!str) return new Date(NaN)
  if (/[TZ]/.test(str) || str.includes('+')) return new Date(str)
  return new Date(str.replace(' ', 'T') + '+07:00')
}

function fmtTime(dt: string) {
  if (!dt) return '—'
  return parseWib(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}

function fmtDateLabel(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00+07:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

function fmtSecs(secs: number) {
  const s = Number(secs || 0)
  if (s < 60) return '< 1m'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

function groupBy<T>(rows: T[], key: (r: T) => number) {
  const map = new Map<number, T[]>()
  for (const r of rows) {
    const k = key(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return map
}

const sumSecs = (rows: any[]) => rows.reduce((s, r) => s + Number(r.duration_seconds || 0), 0)

/** Teks Daily Report satu user (userName) untuk tanggal `date`. */
export function formatDailyReportText(report: any, date: string, userName: string): string {
  const lines: string[] = [`Daily Report - ${fmtDateLabel(date)} - ${userName}`, '']
  const { timelogs, ticket_activities, ticket_timelogs, qc_timelogs, summary } = report

  lines.push('Task yang dikerjakan:')
  if (timelogs.length) {
    for (const [, entries] of groupBy<any>(timelogs, r => r.task_id)) {
      const first = entries[0]
      const last = entries[entries.length - 1]
      lines.push(`• [${fmtTime(first.started_at)}–${fmtTime(last.stopped_at)}] ${first.task_title} (${first.project_name}) — ${fmtSecs(sumSecs(entries))}`)
      const notes = entries.filter((e: any) => e.note).map((e: any) => e.note).join('; ')
      if (notes) lines.push(`  Note: ${notes}`)
    }
    lines.push(`  Total: ${fmtSecs(summary.total_task_seconds)}`)
  } else {
    lines.push('  (tidak ada timelog tercatat)')
  }
  lines.push('')

  const ticketTime = new Map<number, number>()
  for (const tl of ticket_timelogs) ticketTime.set(tl.ticket_id, (ticketTime.get(tl.ticket_id) || 0) + Number(tl.duration_seconds || 0))

  lines.push('Ticket yang ditangani:')
  if (ticket_activities.length) {
    for (const tk of ticket_activities) {
      const secs = ticketTime.get(tk.ticket_id)
      lines.push(`• ${tk.ticket_number} ${tk.ticket_title}${secs ? ` — ${fmtSecs(secs)}` : ''}`)
    }
    if (summary.total_ticket_seconds > 0) lines.push(`  Total ticket time: ${fmtSecs(summary.total_ticket_seconds)}`)
  } else {
    lines.push('  (tidak ada aktivitas ticket)')
  }
  lines.push('')

  if (qc_timelogs.length) {
    lines.push('QC yang dikerjakan:')
    for (const [, entries] of groupBy<any>(qc_timelogs, r => r.qc_form_id)) {
      const first = entries[0]
      const last = entries[entries.length - 1]
      lines.push(`• [${fmtTime(first.started_at)}–${fmtTime(last.stopped_at)}] ${first.task_title} QC #${first.form_sequence} (${first.project_name}) — ${fmtSecs(sumSecs(entries))}`)
    }
    lines.push(`  Total: ${fmtSecs(summary.total_qc_seconds)}`)
    lines.push('')
  }

  const ticketPart = summary.total_ticket_seconds > 0 ? ` | Ticket time: ${fmtSecs(summary.total_ticket_seconds)}` : ''
  const qcPart = summary.total_qc_seconds > 0 ? ` | QC time: ${fmtSecs(summary.total_qc_seconds)}` : ''
  lines.push(`Total task time: ${fmtSecs(summary.total_task_seconds)} | Tickets: ${summary.tickets_count}${ticketPart}${qcPart}`)
  return lines.join('\n')
}

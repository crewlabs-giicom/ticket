<template>
  <div class="space-y-4">

    <!-- Filter -->
    <div class="card p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tanggal</label>
          <input v-model="filters.date" type="date" class="input text-sm py-1.5" />
        </div>
        <div v-if="auth.isAdmin" class="flex flex-col gap-1 min-w-[180px]">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">User</label>
          <AppSelect
            v-model="filters.user_id"
            :options="[{ value: '', label: 'Semua Staff' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Semua Staff"
          />
        </div>
        <button @click="fetchReport" :disabled="loading"
          class="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Tampilkan
        </button>
        <div class="flex gap-1.5 ml-auto flex-wrap">
          <button @click="setDate('today')" class="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Hari ini</button>
          <button @click="setDate('yesterday')" class="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Kemarin</button>
        </div>
      </div>
    </div>

    <!-- Summary chips -->
    <div v-if="loaded" class="flex flex-wrap gap-3">
      <div class="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span class="text-sm font-semibold text-indigo-700">{{ fmtSecs(summary.total_task_seconds) }}</span>
        <span class="text-xs text-indigo-400">task time · {{ summary.tasks_count }} task</span>
      </div>
      <div class="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2">
        <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
        <span class="text-sm font-semibold text-violet-700">{{ summary.tickets_count }}</span>
        <span class="text-xs text-violet-400">ticket ditangani</span>
      </div>
      <div v-if="summary.total_ticket_seconds > 0" class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
        <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span class="text-sm font-semibold text-emerald-700">{{ fmtSecs(summary.total_ticket_seconds) }}</span>
        <span class="text-xs text-emerald-400">ticket timer</span>
      </div>
    </div>

    <!-- 2 Panels -->
    <div v-if="loaded" class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- Panel Task -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <h3 class="text-sm font-semibold text-slate-700">Task & Time Log</h3>
          <span class="ml-auto text-xs text-slate-400">{{ timelogs.length }} entri</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Task</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Project</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mulai</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Selesai</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Durasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-if="!timelogs.length">
                <td colspan="5" class="text-center py-8 text-slate-400 text-xs">Tidak ada timelog pada tanggal ini</td>
              </tr>
              <tr v-for="tl in timelogs" :key="tl.id" class="hover:bg-slate-50/50">
                <td class="px-3 py-2">
                  <div class="text-xs font-medium text-slate-700 line-clamp-2 max-w-[160px]">{{ tl.task_title }}</div>
                  <div v-if="tl.note" class="text-[10px] text-slate-400 mt-0.5 italic line-clamp-1">{{ tl.note }}</div>
                  <div v-if="filters.user_id === ''" class="text-[10px] text-indigo-500 mt-0.5">{{ tl.user_name }}</div>
                </td>
                <td class="px-3 py-2 hidden sm:table-cell">
                  <span class="text-[11px] text-slate-500">{{ tl.project_name }}</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span class="text-xs font-mono text-slate-600">{{ fmtTime(tl.started_at) }}</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span class="text-xs font-mono text-slate-600">{{ fmtTime(tl.stopped_at) }}</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span class="text-xs font-semibold text-indigo-600 font-mono">{{ fmtSecs(tl.duration_seconds) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Per-task total summary -->
        <div v-if="taskGroups.length" class="border-t border-slate-100 px-4 py-2.5 space-y-1.5">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Ringkasan per Task</p>
          <div v-for="g in taskGroups" :key="g.task_id" class="flex items-center justify-between">
            <span class="text-xs text-slate-600 truncate max-w-[200px]">{{ g.task_title }}</span>
            <span class="text-xs font-semibold font-mono text-indigo-600 ml-2 flex-shrink-0">{{ fmtSecs(g.total_seconds) }}</span>
          </div>
          <div class="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
            <span class="text-xs font-semibold text-slate-700">Total</span>
            <span class="text-xs font-bold font-mono text-indigo-700">{{ fmtSecs(summary.total_task_seconds) }}</span>
          </div>
        </div>
      </div>

      <!-- Panel Ticket -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
          <h3 class="text-sm font-semibold text-slate-700">Ticket Ditangani</h3>
          <span class="ml-auto text-xs text-slate-400">{{ ticketActivities.length }} respons</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ticket</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Judul</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Resolved</th>
                <th class="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Durasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-if="!ticketActivities.length">
                <td colspan="4" class="text-center py-8 text-slate-400 text-xs">Tidak ada aktivitas ticket pada tanggal ini</td>
              </tr>
              <tr v-for="ta in pagedTickets" :key="ta.id" class="hover:bg-slate-50/50">
                <td class="px-3 py-2 whitespace-nowrap">
                  <button @click="openTicket(ta)" class="text-xs font-mono font-semibold text-indigo-600 hover:underline">{{ ta.ticket_number }}</button>
                </td>
                <td class="px-3 py-2">
                  <div class="text-xs text-slate-700 line-clamp-2 max-w-[200px]">{{ ta.ticket_title }}</div>
                  <div v-if="filters.user_id === ''" class="text-[10px] text-indigo-500 mt-0.5">{{ ta.user_name }}</div>
                  <div class="text-[10px] text-slate-400">{{ ta.project_name }}</div>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span class="text-xs font-mono" :class="ta.resolved_at ? 'text-green-600' : 'text-slate-400'">{{ ta.resolved_at ? fmtTime(ta.resolved_at) : '—' }}</span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  <span v-if="ticketTimeMap.get(ta.ticket_id)" class="text-xs font-semibold font-mono text-emerald-600">{{ fmtSecs(ticketTimeMap.get(ta.ticket_id)!) }}</span>
                  <span v-else class="text-xs text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Ticket time total -->
        <div v-if="summary.total_ticket_seconds > 0" class="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-700">Total ticket time</span>
          <span class="text-xs font-bold font-mono text-emerald-600">{{ fmtSecs(summary.total_ticket_seconds) }}</span>
        </div>
        <!-- Ticket pagination -->
        <div v-if="ticketTotalPages > 1" class="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">
          <span>{{ (ticketPage - 1) * TICKET_PER_PAGE + 1 }}–{{ Math.min(ticketPage * TICKET_PER_PAGE, ticketActivities.length) }} dari {{ ticketActivities.length }}</span>
          <div class="flex items-center gap-1">
            <button :disabled="ticketPage <= 1" @click="ticketPage--"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">‹</button>
            <span class="px-1 font-medium text-slate-700">{{ ticketPage }} / {{ ticketTotalPages }}</span>
            <button :disabled="ticketPage >= ticketTotalPages" @click="ticketPage++"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Copy-paste text area -->
    <div v-if="loaded" class="card p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
          <h3 class="text-sm font-semibold text-slate-700">Teks Siap Copas</h3>
        </div>
        <button @click="copyText"
          :class="['inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all', copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600']">
          <svg v-if="copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"/></svg>
          {{ copied ? 'Tersalin!' : 'Copy' }}
        </button>
      </div>
      <textarea
        :value="reportText"
        readonly
        rows="16"
        class="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 resize-y text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 leading-relaxed"
        @click="($event.target as HTMLTextAreaElement).select()"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !loaded" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4 space-y-3">
        <div class="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
        <div class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-3 bg-slate-100 rounded animate-pulse" :style="{ width: `${70 + i * 5}%` }" />
        </div>
      </div>
      <div class="card p-4 space-y-3">
        <div class="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
        <div class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-3 bg-slate-100 rounded animate-pulse" :style="{ width: `${65 + i * 6}%` }" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const tabs = useTabStore()

if (!auth.isStaffOrAdmin) await navigateTo('/')

const todayWib = () => new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
// Staff selalu lihat data diri sendiri, admin bisa pilih user
const filters = reactive({ date: todayWib(), user_id: auth.isAdmin ? '' : String(auth.user?.id ?? '') })
const loading = ref(false)
const loaded = ref(false)
const copied = ref(false)

const timelogs = ref<any[]>([])
const ticketActivities = ref<any[]>([])
const ticketTimelogs = ref<any[]>([])
const summary = ref({ total_task_seconds: 0, total_ticket_seconds: 0, tasks_count: 0, tickets_count: 0 })
const reportUser = ref<any>(null)

const { data: userData } = await useFetch('/api/users', { query: { limit: 500 } })
const staffUsers = computed(() =>
  ((userData.value as any)?.data || []).filter((u: any) => u.is_active && u.role !== 'customer')
)

function setDate(preset: 'today' | 'yesterday') {
  const d = new Date()
  if (preset === 'yesterday') d.setDate(d.getDate() - 1)
  filters.date = d.toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
}

async function fetchReport() {
  loading.value = true
  try {
    const res = await $fetch('/api/reports/daily', {
      query: { date: filters.date, user_id: filters.user_id || undefined }
    }) as any
    timelogs.value = res.timelogs || []
    ticketActivities.value = res.ticket_activities || []
    ticketTimelogs.value = res.ticket_timelogs || []
    summary.value = res.summary || { total_task_seconds: 0, total_ticket_seconds: 0, tasks_count: 0, tickets_count: 0 }
    reportUser.value = res.user
    loaded.value = true
  } finally { loading.value = false }
}

// Ticket pagination
const ticketPage = ref(1)
const TICKET_PER_PAGE = 10
const pagedTickets = computed(() => ticketActivities.value.slice((ticketPage.value - 1) * TICKET_PER_PAGE, ticketPage.value * TICKET_PER_PAGE))
const ticketTotalPages = computed(() => Math.ceil(ticketActivities.value.length / TICKET_PER_PAGE))
watch(ticketActivities, () => { ticketPage.value = 1 })

// Per-ticket time from ticket_timelogs keyed by ticket_id
const ticketTimeMap = computed(() => {
  const map = new Map<number, number>()
  for (const tl of ticketTimelogs.value) {
    map.set(tl.ticket_id, (map.get(tl.ticket_id) || 0) + Number(tl.duration_seconds || 0))
  }
  return map
})

// Per-task grouped summary
const taskGroups = computed(() => {
  const map = new Map<number, { task_id: number; task_title: string; total_seconds: number }>()
  for (const tl of timelogs.value) {
    if (!map.has(tl.task_id)) map.set(tl.task_id, { task_id: tl.task_id, task_title: tl.task_title, total_seconds: 0 })
    map.get(tl.task_id)!.total_seconds += Number(tl.duration_seconds || 0)
  }
  return [...map.values()]
})

// Format helpers — DB stores datetimes in WIB without timezone suffix, must append +07:00
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
  if (s < 60) return `< 1m`
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

// Report text for copy-paste
const reportText = computed(() => {
  const dateLabel = fmtDateLabel(filters.date)
  const userName = reportUser.value?.name || (auth.isAdmin && !filters.user_id ? 'All Staff' : (auth.user?.name || '—'))
  const lines: string[] = [`Daily Report - ${dateLabel} - ${userName}`, '']

  if (timelogs.value.length) {
    lines.push('Task yang dikerjakan:')
    for (const g of taskGroups.value) {
      const entries = timelogs.value.filter(t => t.task_id === g.task_id)
      const first = entries[0]
      const last = entries[entries.length - 1]
      const who = filters.user_id === '' ? ` (${first.user_name})` : ''
      lines.push(`• [${fmtTime(first.started_at)}–${fmtTime(last.stopped_at)}] ${g.task_title} (${first.project_name})${who} — ${fmtSecs(g.total_seconds)}`)
      const notes = entries.filter(e => e.note).map(e => e.note).join('; ')
      if (notes) lines.push(`  Note: ${notes}`)
    }
    lines.push(`  Total: ${fmtSecs(summary.value.total_task_seconds)}`)
    lines.push('')
  } else {
    lines.push('Task yang dikerjakan:')
    lines.push('  (tidak ada timelog tercatat)')
    lines.push('')
  }

  if (ticketActivities.value.length) {
    lines.push('Ticket yang ditangani:')
    for (const tk of ticketActivities.value) {
      const who = filters.user_id === '' ? ` (${tk.user_name})` : ''
      const ticketSecs = ticketTimeMap.value.get(tk.ticket_id)
      const duration = ticketSecs ? ` — ${fmtSecs(ticketSecs)}` : ''
      lines.push(`• ${tk.ticket_number} ${tk.ticket_title}${who}${duration}`)
    }
    if (summary.value.total_ticket_seconds > 0) {
      lines.push(`  Total ticket time: ${fmtSecs(summary.value.total_ticket_seconds)}`)
    }
    lines.push('')
  } else {
    lines.push('Ticket yang ditangani:')
    lines.push('  (tidak ada aktivitas ticket)')
    lines.push('')
  }

  const ticketTimePart = summary.value.total_ticket_seconds > 0 ? ` | Ticket time: ${fmtSecs(summary.value.total_ticket_seconds)}` : ''
  lines.push(`Total task time: ${fmtSecs(summary.value.total_task_seconds)} | Tickets: ${summary.value.tickets_count}${ticketTimePart}`)
  return lines.join('\n')
})

async function copyText() {
  try {
    await navigator.clipboard.writeText(reportText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

function openTicket(ta: any) {
  tabs.openTab({ id: ta.ticket_id, ticket_number: ta.ticket_number, title: ta.ticket_title })
}

// Auto-load hari ini saat mount
onMounted(fetchReport)
</script>

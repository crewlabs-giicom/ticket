<template>
  <div class="space-y-5">
    <!-- Filters -->
    <div class="card p-4 flex flex-wrap items-end gap-3">
      <!-- Preset range buttons -->
      <div>
        <label class="label text-xs mb-1">Rentang Waktu</label>
        <div class="flex gap-1">
          <button v-for="p in presets" :key="p.key" @click="setRange(p.key)"
            :class="['px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors', activePreset === p.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300']">
            {{ p.label }}
          </button>
        </div>
      </div>
      <div><label class="label text-xs">Dari</label><input v-model="filters.from" type="date" class="input text-sm w-36" @change="activePreset = ''" /></div>
      <div><label class="label text-xs">Sampai</label><input v-model="filters.to" type="date" class="input text-sm w-36" @change="activePreset = ''" /></div>
      <div><label class="label text-xs">Project</label>
        <AppSelect v-model="filters.project_id" :options="[{ value: '', label: 'Semua' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]" placeholder="Semua" class="w-40" />
      </div>
      <div><label class="label text-xs">Staff</label>
        <AppSelect v-model="filters.staff_id" :options="[{ value: '', label: 'Semua' }, ...staff.map((u: any) => ({ value: u.id, label: u.name }))]" placeholder="Semua" class="w-40" />
      </div>
      <button @click="fetchAll" class="btn-primary">Tampilkan</button>
    </div>

    <!-- Ticket summary report (existing) -->
    <div v-if="d">
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Report Ticket — SLA & Durasi</h3>
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div class="stat-card"><span class="text-xs text-slate-500">Total Ticket</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.total ?? 0 }}</span></div>
        <div class="stat-card"><span class="text-xs text-slate-500">Avg First Response</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.avg_first_response_hrs ?? '-' }}j</span></div>
        <div class="stat-card"><span class="text-xs text-slate-500">Avg Resolusi</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.avg_resolution_hrs ?? '-' }}j</span></div>
        <div class="stat-card border-l-4 border-l-green-400"><span class="text-xs text-slate-500">SLA Terpenuhi</span><span class="text-2xl font-bold text-green-600">{{ d.timeReport?.sla_met ?? 0 }}</span><span class="text-xs text-slate-400">{{ d.timeReport?.sla_met_pct ?? 0 }}%</span></div>
        <div class="stat-card border-l-4 border-l-red-400"><span class="text-xs text-slate-500">SLA Breach</span><span class="text-2xl font-bold text-red-600">{{ d.timeReport?.sla_breach ?? 0 }}</span><span class="text-xs text-slate-400">{{ d.timeReport?.sla_met_pct ? (100 - d.timeReport.sla_met_pct).toFixed(1) : 0 }}%</span></div>
      </div>
      <div class="card p-5 mb-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-3">SLA Breach per Priority</h3>
        <div class="space-y-3">
          <div v-for="p in d.byPriorityTime" :key="p.name" class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: p.color }" />
            <span class="text-sm text-slate-700 w-24 flex-shrink-0">{{ p.name }}</span>
            <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" :style="{ width: p.total ? (p.sla_breach / p.total * 100) + '%' : '0%', background: p.color }" />
            </div>
            <span class="text-xs text-slate-500 w-28 text-right flex-shrink-0">{{ p.sla_breach }}/{{ p.total }} breach · avg {{ p.avg_hrs ?? '-' }}j</span>
          </div>
        </div>
      </div>
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Volume & Produktivitas</h3>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div class="card p-5"><h4 class="text-sm font-semibold text-slate-900 mb-3">Tren Harian</h4><div class="h-52"><Bar v-if="trendData" :data="trendData" :options="barOpts" /></div></div>
        <div class="card p-5"><h4 class="text-sm font-semibold text-slate-900 mb-3">Per Status</h4><div class="h-52"><Doughnut v-if="statusData" :data="statusData" :options="donutOpts" /></div></div>
      </div>
      <div class="card overflow-hidden mb-5">
        <div class="px-5 py-4 border-b border-slate-100"><h3 class="text-sm font-semibold text-slate-900">Produktivitas per Staff</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Staff</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resolved</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">SLA Breach</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rate Selesai</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!d.byStaff?.length"><td colspan="5" class="text-center py-6 text-slate-400 text-xs">Tidak ada data</td></tr>
            <tr v-for="s in d.byStaff" :key="s.id" class="hover:bg-slate-50">
              <td class="px-4 py-3"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">{{ s.name?.charAt(0) }}</div><span class="text-sm font-medium text-slate-900">{{ s.name }}</span></div></td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ s.total }}</td>
              <td class="px-4 py-3 text-sm text-green-600 font-medium">{{ s.resolved }}</td>
              <td class="px-4 py-3"><span :class="['text-sm font-medium', s.sla_breach > 0 ? 'text-red-600' : 'text-slate-400']">{{ s.sla_breach }}</span></td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-green-500 rounded-full" :style="{ width: s.total ? (s.resolved / s.total * 100) + '%' : '0%' }" /></div>
                  <span class="text-xs text-slate-500 w-8">{{ s.total ? Math.round(s.resolved / s.total * 100) : 0 }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== ACTIVITY TRACKER SECTION ===== -->
    <div>
      <h2 class="text-base font-bold text-slate-800 mb-4">Activity Tracker — Waktu Kerja Staff</h2>

      <!-- Staff summary cards -->
      <div v-if="tl.loading" class="text-center py-10 text-slate-400 text-sm">Memuat data activity…</div>
      <div v-else-if="tl.staffSummary.length === 0" class="card p-8 text-center text-slate-400 text-sm">Belum ada data. Gunakan tombol Start pada task untuk mencatat waktu kerja.</div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div v-for="s in tl.staffSummary" :key="s.id" class="card p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">{{ s.name?.charAt(0) }}</div>
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ s.name }}</p>
              <p class="text-xs text-slate-400">{{ s.tasks_worked }} task · {{ s.tickets_handled }} tiket</p>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs text-slate-500">
              <span>Task: <strong class="text-indigo-600">{{ fmtSecs(s.task_seconds) }}</strong></span>
              <span>Tiket: <strong class="text-amber-600">{{ fmtSecs(s.ticket_lifecycle_seconds) }}</strong></span>
            </div>
            <!-- Composition bar -->
            <div class="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: s.task_pct + '%' }" />
            </div>
            <div class="flex justify-between text-xs text-slate-400">
              <span>{{ s.task_pct }}% Task</span>
              <span>{{ s.ticket_pct }}% Tiket</span>
            </div>
          </div>
          <!-- Per-project breakdown -->
          <div v-if="staffProjectMap.get(s.id)?.length" class="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Per Project</p>
            <div v-for="proj in staffProjectMap.get(s.id)" :key="proj.project_id" class="flex items-center gap-2 text-xs">
              <div class="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span class="flex-1 text-slate-700 truncate font-medium">{{ proj.project_name }}</span>
              <span class="text-indigo-600 font-semibold whitespace-nowrap">{{ fmtSecs(proj.task_seconds) }}</span>
              <span class="text-slate-400 whitespace-nowrap">{{ proj.task_count }}t</span>
              <span v-if="proj.ticket_count" class="text-amber-500 whitespace-nowrap">{{ proj.ticket_count }}🎫</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs: Detail Log vs Ticket Lifecycle -->
      <div class="card overflow-hidden">
        <div class="flex border-b border-slate-100">
          <button v-for="tab in activityTabs" :key="tab.key" @click="activeTab = tab.key"
            :class="['px-5 py-3 text-sm font-medium border-b-2 transition-colors', activeTab === tab.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700']">
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab: Timelog detail -->
        <div v-if="activeTab === 'logs'">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Staff</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Task</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Project</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" @click="toggleSort('start')">
                  Mulai <span class="text-indigo-400">{{ sortIcon('start') }}</span>
                </th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" @click="toggleSort('end')">
                  Selesai <span class="text-indigo-400">{{ sortIcon('end') }}</span>
                </th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" @click="toggleSort('duration')">
                  Durasi <span class="text-indigo-400">{{ sortIcon('duration') }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!tl.logs.length"><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Tidak ada data timelog dalam rentang ini</td></tr>
              <tr v-for="row in tl.logs" :key="row.id" class="hover:bg-slate-50">
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">{{ row.user_name?.charAt(0) }}</div>
                    <span class="text-xs text-slate-600">{{ row.user_name }}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-700 max-w-[200px] truncate">{{ row.task_title }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-400">{{ row.project_name }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{{ fmtDatetime(row.started_at) }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{{ fmtDatetime(row.stopped_at) }}</td>
                <td class="px-4 py-2.5 text-right font-medium text-indigo-700 text-xs whitespace-nowrap">{{ fmtSecs(row.duration_seconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tab: Ticket lifecycle -->
        <div v-if="activeTab === 'ticket_lifecycle'">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nomor</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Judul</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Project</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assignee</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dibuat</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Selesai</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lifecycle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!tl.ticketLifecycle.length"><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Belum ada ticket resolved/closed dalam rentang ini</td></tr>
              <tr v-for="tk in tl.ticketLifecycle" :key="tk.id" class="hover:bg-slate-50">
                <td class="px-4 py-2.5 text-xs font-mono text-indigo-600">{{ tk.ticket_number }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-700 max-w-[200px] truncate">{{ tk.title }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-400">{{ tk.project_name }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-600">{{ tk.assigned_to_name || '—' }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{{ fmtDatetime(tk.created_at) }}</td>
                <td class="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{{ fmtDatetime(tk.ended_at) }}</td>
                <td class="px-4 py-2.5 text-right font-medium text-amber-600 text-xs whitespace-nowrap">{{ fmtSecs(tk.lifecycle_seconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
definePageMeta({ middleware: 'auth' })

const now = new Date()
const fmt = (d: Date) => d.toISOString().slice(0, 10)

const filters = reactive({
  from: fmt(new Date(now.getTime() - 29 * 86400000)),
  to: fmt(now),
  project_id: '',
  staff_id: '',
  priority_id: ''
})

const activePreset = ref('month')
const presets = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'quarter', label: 'Kuartal' },
]

function setRange(preset: string) {
  const n = new Date()
  activePreset.value = preset
  if (preset === 'today') {
    filters.from = fmt(n)
    filters.to = fmt(n)
  } else if (preset === 'week') {
    const day = n.getDay()
    const monday = new Date(n)
    monday.setDate(n.getDate() - (day === 0 ? 6 : day - 1))
    filters.from = fmt(monday)
    filters.to = fmt(n)
  } else if (preset === 'month') {
    filters.from = fmt(new Date(n.getFullYear(), n.getMonth(), 1))
    filters.to = fmt(n)
  } else if (preset === 'quarter') {
    const q = Math.floor(n.getMonth() / 3)
    filters.from = fmt(new Date(n.getFullYear(), q * 3, 1))
    filters.to = fmt(n)
  }
  fetchAll()
}

const { data: pd } = await useFetch('/api/projects')
const { data: ud } = await useFetch('/api/users')
const projects = computed(() => (pd.value as any)?.data || [])
const staff = computed(() => ((ud.value as any)?.data || []).filter((u: any) => u.role !== 'customer'))

// Existing ticket report
const d = ref<any>(null)
async function fetchReport() {
  const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  const res = await $fetch('/api/reports', { query: q }) as any
  d.value = res.data
}

// Activity tracker data
const sortKey = ref<'start' | 'end' | 'duration'>('start')
const sortDir = ref<'asc' | 'desc'>('desc')
const activeTab = ref<'logs' | 'ticket_lifecycle'>('logs')
const activityTabs = [
  { key: 'logs', label: 'Detail Timelog' },
  { key: 'ticket_lifecycle', label: 'Lifecycle Ticket' },
]

const tl = reactive({
  loading: false,
  logs: [] as any[],
  staffSummary: [] as any[],
  staffPerProject: [] as any[],
  ticketLifecycle: [] as any[],
})

const staffProjectMap = computed(() => {
  const map = new Map<number, any[]>()
  for (const row of tl.staffPerProject) {
    if (!map.has(row.user_id)) map.set(row.user_id, [])
    map.get(row.user_id)!.push(row)
  }
  return map
})

function sortCode() {
  const map: Record<string, Record<string, string>> = {
    start: { asc: 'start_asc', desc: 'start_desc' },
    end: { asc: 'end_asc', desc: 'end_desc' },
    duration: { asc: 'duration_asc', desc: 'duration_desc' },
  }
  return map[sortKey.value]?.[sortDir.value] || 'start_desc'
}

function toggleSort(key: 'start' | 'end' | 'duration') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
  fetchTimelogs()
}

function sortIcon(key: string) {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

async function fetchTimelogs() {
  tl.loading = true
  try {
    const q: Record<string, any> = {
      date_from: filters.from,
      date_to: filters.to,
      sort: sortCode(),
    }
    if (filters.project_id) q.project_id = filters.project_id
    if (filters.staff_id) q.user_id = filters.staff_id
    const res = await $fetch<any>('/api/reports/timelogs', { query: q })
    tl.logs = res.logs || []
    tl.staffSummary = res.staff_summary || []
    tl.staffPerProject = res.staff_per_project || []
    tl.ticketLifecycle = res.ticket_lifecycle || []
  } finally {
    tl.loading = false
  }
}

async function fetchAll() {
  await Promise.all([fetchReport(), fetchTimelogs()])
}

function fmtSecs(s: number) {
  if (!s || s < 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}h ${h % 24}j`
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

function fmtDatetime(dt: string | null) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const trendData = computed(() => {
  const t = d.value?.dailyTrend || []
  return {
    labels: t.map((x: any) => x.date?.slice(5)),
    datasets: [
      { label: 'Masuk', data: t.map((x: any) => x.created), backgroundColor: '#6366f180' },
      { label: 'Resolved', data: t.map((x: any) => x.resolved), backgroundColor: '#22c55e80' }
    ]
  }
})

const statusData = computed(() => {
  const s = d.value?.byStatus || []
  return { labels: s.map((x: any) => x.name), datasets: [{ data: s.map((x: any) => x.count), backgroundColor: s.map((x: any) => x.color), borderWidth: 0 }] }
})

const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 10 } } } }

// Initial load
await Promise.all([fetchReport(), fetchTimelogs()])
</script>

<template>
  <div class="space-y-4">

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="stat-card">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Total Tasks</span>
        <span class="text-2xl font-bold text-slate-900 mt-1">{{ stats.total }}</span>
        <span class="text-xs text-slate-400">Semua task</span>
      </div>
      <div class="stat-card border-l-4 border-l-blue-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Open</span>
        <span class="text-2xl font-bold text-blue-600 mt-1">{{ stats.open }}</span>
        <span class="text-xs text-slate-400">Belum selesai</span>
      </div>
      <div class="stat-card border-l-4 border-l-green-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Completed</span>
        <span class="text-2xl font-bold text-green-600 mt-1">{{ stats.done }}</span>
        <span class="text-xs text-slate-400">Sudah selesai</span>
      </div>
      <div class="stat-card border-l-4 border-l-violet-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Linked Tickets</span>
        <span class="text-2xl font-bold text-violet-600 mt-1">{{ stats.totalTickets }}</span>
        <span class="text-xs text-slate-400">Total ticket terhubung</span>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tanggal Dibuat</label>
          <div class="flex items-center gap-1.5">
            <input v-model="filters.date_from" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
            <span class="text-xs text-slate-400 flex-shrink-0">—</span>
            <input v-model="filters.date_to" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Status</label>
          <AppMultiSelect
            v-model="filters.statuses"
            :options="STATUS_OPTIONS"
            placeholder="Semua Status"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Assignee</label>
          <AppSelect
            v-model="filters.assigned_to"
            :options="[{ value: '', label: 'Semua Assignee' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Semua Assignee"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dibuat Oleh</label>
          <AppSelect
            v-model="filters.created_by"
            :options="[{ value: '', label: 'Semua User' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Semua User"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Project</label>
          <AppSelect
            v-model="filters.project_id"
            :options="[{ value: '', label: 'Semua Project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
            placeholder="Semua Project"
          />
        </div>

        <div class="flex flex-col gap-1 justify-end sm:col-span-2 lg:col-span-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide invisible">Aksi</label>
          <div class="flex items-center gap-2">
            <AppRefreshButton :loading="loading" @click="handleRefresh" />
            <button @click="exportExcel" :disabled="exporting || !tasks.length" class="inline-flex items-center gap-1.5 btn-ghost text-xs border border-slate-200 disabled:opacity-40">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Project</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Dibuat Oleh</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Assignee</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">Tgl Buat</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">Tgl Selesai</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Durasi</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tickets</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td colspan="9" class="text-center py-10 text-slate-400 text-sm">Memuat data...</td>
            </tr>
            <tr v-else-if="!tasks.length">
              <td colspan="9" class="text-center py-10 text-slate-400 text-sm">Tidak ada data</td>
            </tr>
            <tr v-for="t in tasks" :key="t.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-2.5"><span class="text-xs text-slate-600">{{ t.project_name }}</span></td>
              <td class="px-4 py-2.5 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.created_by_name || '—' }}</span></td>
              <td class="px-4 py-2.5 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.assigned_to_name || '—' }}</span></td>
              <td class="px-4 py-2.5 max-w-[220px]">
                <button @click="openTask(t)" :disabled="taskPanelLoading === t.id" class="text-xs text-left text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors line-clamp-2 disabled:opacity-50">
                  {{ t.title }}
                </button>
              </td>
              <td class="px-4 py-2.5">
                <span class="badge text-white text-[10px] whitespace-nowrap" :style="{ background: STATUS_COLORS[t.status] }">
                  {{ STATUS_LABELS[t.status] ?? t.status }}
                </span>
              </td>
              <td class="px-4 py-2.5 hidden xl:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap">{{ fmtDate(t.created_at) }}</span></td>
              <td class="px-4 py-2.5 hidden xl:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap">{{ fmtDate(t.completed_at) || '—' }}</span></td>
              <td class="px-4 py-2.5 hidden lg:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap font-mono">{{ fmtDuration(t.created_at, t.completed_at) }}</span></td>
              <td class="px-4 py-2.5">
                <span v-if="t.ticket_count" class="inline-flex items-center gap-1 text-[10px] font-medium bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                  🎫 {{ t.ticket_count }}
                </span>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination footer -->
      <div v-if="pagination.total > 0" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">
            {{ Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total) }}–{{ Math.min(pagination.page * pagination.limit, pagination.total) }} dari {{ pagination.total }}
          </span>
          <select
            :value="pagination.limit"
            @change="onLimitChange(Number(($event.target as HTMLSelectElement).value))"
            class="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }} / hal</option>
          </select>
        </div>
        <div v-if="pagination.totalPages > 1" class="flex items-center gap-1">
          <button :disabled="pagination.page <= 1" @click="onPageChange(pagination.page - 1)"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <template v-for="p in pageButtons" :key="p">
            <span v-if="p === '...'" class="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
            <button v-else @click="onPageChange(Number(p))"
              :class="['w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors', Number(p) === pagination.page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100']">
              {{ p }}
            </button>
          </template>
          <button :disabled="pagination.page >= pagination.totalPages" @click="onPageChange(pagination.page + 1)"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Task Detail Panel -->
    <TaskDetailPanel v-if="showTaskPanel && taskPanelData" :task="taskPanelData" @close="showTaskPanel = false" />

  </div>
</template>

<script setup lang="ts">
import * as XLSX from 'xlsx'

definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const { fmtDate } = useDate()

if (!auth.isStaffOrAdmin) {
  await navigateTo('/')
}

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]
const STATUS_COLORS: Record<string, string> = {
  backlog: '#94a3b8',
  todo: '#60a5fa',
  in_progress: '#f59e0b',
  review: '#a78bfa',
  done: '#34d399',
}
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
}

const today = new Date()
const oneMonthAgo = new Date(today)
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

const filters = reactive({
  date_from: toDateStr(oneMonthAgo),
  date_to: toDateStr(today),
  statuses: [] as string[],
  assigned_to: '',
  created_by: '',
  project_id: '',
})

const pagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 10 })
const loading = ref(false)
const exporting = ref(false)
const tasks = ref<any[]>([])
const stats = ref({ total: 0, open: 0, done: 0, totalTickets: 0 })

const { data: prd } = await useFetch('/api/projects')
const { data: userData } = await useFetch('/api/users', { query: { limit: 500 } })

const projects = computed(() => (prd.value as any)?.data || [])
const staffUsers = computed(() =>
  ((userData.value as any)?.data || []).filter((u: any) => u.is_active && u.role !== 'customer')
)

function buildQuery(extra: Record<string, any> = {}) {
  const q: Record<string, any> = { page: pagination.page, limit: pagination.limit }
  if (filters.date_from) q.date_from = filters.date_from
  if (filters.date_to) q.date_to = filters.date_to
  if (filters.statuses.length === 1) q.status = filters.statuses[0]
  if (filters.assigned_to) q.assigned_to = filters.assigned_to
  if (filters.created_by) q.created_by = filters.created_by
  if (filters.project_id) q.project_id = filters.project_id
  return { ...q, ...extra }
}

async function fetchTasks() {
  loading.value = true
  try {
    const res = await $fetch('/api/tasks', { query: buildQuery() }) as any
    tasks.value = res.data || []
    pagination.total = res.total ?? 0
    pagination.totalPages = res.totalPages ?? 1
    pagination.page = res.page ?? 1
    if (res.stats) stats.value = res.stats
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) { pagination.page = p; fetchTasks() }
function onLimitChange(l: number) { pagination.limit = l; pagination.page = 1; fetchTasks() }

watchDebounced(filters, () => { pagination.page = 1; fetchTasks() }, { debounce: 300, maxWait: 1000 })
onMounted(fetchTasks)

async function handleRefresh() { await fetchTasks() }

function fmtDuration(from: string, to?: string | null): string {
  if (!to) return '—'
  const secs = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  if (secs < 0) return '—'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const pageButtons = computed(() => {
  const p = pagination.page
  const t = pagination.totalPages
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const result: (number | string)[] = [1]
  if (p > 3) result.push('...')
  for (let i = Math.max(2, p - 1); i <= Math.min(t - 1, p + 1); i++) result.push(i)
  if (p < t - 2) result.push('...')
  result.push(t)
  return result
})

// Task Detail Panel
const showTaskPanel = ref(false)
const taskPanelData = ref<any>(null)
const taskPanelLoading = ref<number | false>(false)

async function openTask(t: any) {
  taskPanelLoading.value = t.id
  try {
    const res = await $fetch<any>(`/api/tasks/${t.id}`)
    taskPanelData.value = res
    showTaskPanel.value = true
  } finally {
    taskPanelLoading.value = false
  }
}

async function exportExcel() {
  exporting.value = true
  try {
    const res = await $fetch('/api/tasks', { query: buildQuery({ limit: 9999, page: 1, export: '1' }) }) as any
    const rows = (res.data as any[]).map((t: any) => ({
      'Project': t.project_name,
      'Dibuat Oleh': t.created_by_name || '—',
      'Assignee': t.assigned_to_name || '—',
      'Task': t.title,
      'Status': STATUS_LABELS[t.status] ?? t.status,
      'Tgl Buat': fmtDate(t.created_at),
      'Tgl Selesai': fmtDate(t.completed_at) || '—',
      'Durasi': fmtDuration(t.created_at, t.completed_at),
      'Linked Tickets': t.ticket_count ?? 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report Task')
    XLSX.writeFile(wb, `report-task-${filters.date_from}-${filters.date_to}.xlsx`)
  } finally {
    exporting.value = false
  }
}
</script>

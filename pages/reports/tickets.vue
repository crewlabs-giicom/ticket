<template>
  <div class="space-y-4">

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="stat-card">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Avg SLA</span>
        <span class="text-2xl font-bold text-slate-900 mt-1">{{ stats.avgSla ?? '—' }}</span>
        <span class="text-xs text-slate-400">Waktu rata-rata resolve</span>
      </div>
      <div class="stat-card border-l-4 border-l-blue-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Open</span>
        <span class="text-2xl font-bold text-blue-600 mt-1">{{ stats.open }}</span>
        <span class="text-xs text-slate-400">Belum diselesaikan</span>
      </div>
      <div class="stat-card border-l-4 border-l-green-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Resolved</span>
        <span class="text-2xl font-bold text-green-600 mt-1">{{ stats.resolved }}</span>
        <span class="text-xs text-slate-400">Sudah diselesaikan</span>
      </div>
      <div class="stat-card border-l-4 border-l-red-400">
        <span class="text-[11px] text-slate-500 uppercase tracking-wide font-medium">SLA Breach</span>
        <span class="text-2xl font-bold text-red-600 mt-1">{{ stats.breached }}</span>
        <span class="text-xs text-slate-400">Melewati batas SLA</span>
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
            v-model="filters.status_ids"
            :options="statuses.map((s: any) => ({ value: s.id, label: s.name }))"
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
            :options="[{ value: '', label: 'Semua User' }, ...allUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
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

        <div class="flex flex-col gap-1 justify-end">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">SLA Breach</label>
          <label class="flex items-center gap-2 cursor-pointer h-9 px-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors w-fit">
            <input v-model="filters.sla_breach" type="checkbox" class="w-3.5 h-3.5 rounded accent-red-500" />
            <span class="text-sm text-slate-600">Hanya yang breach</span>
          </label>
        </div>

        <div class="flex flex-col gap-1 justify-end sm:col-span-2 lg:col-span-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide invisible">Aksi</label>
          <div class="flex items-center gap-2">
            <AppRefreshButton :loading="loading" @click="handleRefresh" />
            <button @click="exportExcel" :disabled="exporting || !tickets.length" class="inline-flex items-center gap-1.5 btn-ghost text-xs border border-slate-200 disabled:opacity-40">
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
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Menu</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Dibuat Oleh</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Assignee</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Kode</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">Tgl Buat</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">Tgl Resolve</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">SLA</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Breach</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td colspan="11" class="text-center py-10 text-slate-400 text-sm">Memuat data...</td>
            </tr>
            <tr v-else-if="!tickets.length">
              <td colspan="11" class="text-center py-10 text-slate-400 text-sm">Tidak ada data</td>
            </tr>
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-2.5"><span class="text-xs text-slate-600">{{ t.project_name }}</span></td>
              <td class="px-4 py-2.5 hidden lg:table-cell"><span class="text-xs text-slate-500">{{ t.system_menu_name || '—' }}</span></td>
              <td class="px-4 py-2.5 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.created_by_name }}</span></td>
              <td class="px-4 py-2.5 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.assigned_to_name || '—' }}</span></td>
              <td class="px-4 py-2.5">
                <button @click="openTicket(t)" class="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors whitespace-nowrap">
                  {{ t.ticket_number }}
                </button>
              </td>
              <td class="px-4 py-2.5 max-w-[200px]">
                <p class="text-xs text-slate-700 line-clamp-2">{{ t.title }}</p>
              </td>
              <td class="px-4 py-2.5">
                <span class="badge text-white text-[10px] whitespace-nowrap" :style="{ background: t.status_color }">{{ t.status_name }}</span>
              </td>
              <td class="px-4 py-2.5 hidden xl:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap">{{ fmtDate(t.created_at) }}</span></td>
              <td class="px-4 py-2.5 hidden xl:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap">{{ fmtDate(t.resolved_at || t.closed_at) || '—' }}</span></td>
              <td class="px-4 py-2.5 hidden lg:table-cell"><span class="text-xs text-slate-500 whitespace-nowrap font-mono">{{ fmtDuration(t.created_at, t.resolved_at || t.closed_at) }}</span></td>
              <td class="px-4 py-2.5">
                <span v-if="t.sla_breached" class="badge bg-red-100 text-red-600 text-[10px] whitespace-nowrap">Breach</span>
                <span v-else class="badge bg-green-100 text-green-600 text-[10px] whitespace-nowrap">OK</span>
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

  </div>
</template>

<script setup lang="ts">
import * as XLSX from 'xlsx'

definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const tabs = useTabStore()
const { fmtDate } = useDate()

if (!auth.isStaffOrAdmin) {
  await navigateTo('/')
}

const today = new Date()
const oneMonthAgo = new Date(today)
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

const filters = reactive({
  date_from: toDateStr(oneMonthAgo),
  date_to: toDateStr(today),
  status_ids: [] as number[],
  assigned_to: '',
  created_by: '',
  project_id: '',
  sla_breach: false,
})

const pagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 10 })
const loading = ref(false)
const exporting = ref(false)
const tickets = ref<any[]>([])
const stats = ref({ open: 0, resolved: 0, breached: 0, avgSla: null as string | null })

const { data: sd } = await useFetch('/api/statuses')
const { data: prd } = await useFetch('/api/projects')
const { data: staffData } = await useFetch('/api/users', { query: { role: 'staff', limit: 500 } })
const { data: allData } = await useFetch('/api/users', { query: { limit: 500 } })

const statuses = computed(() => (sd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data || [])
const staffUsers = computed(() => ((staffData.value as any)?.data || []).filter((u: any) => u.is_active))
const allUsers = computed(() => (allData.value as any)?.data || [])

function buildQuery(extra: Record<string, any> = {}) {
  const q: Record<string, any> = {
    page: pagination.page,
    limit: pagination.limit,
  }
  if (filters.date_from) q.date_from = filters.date_from
  if (filters.date_to) q.date_to = filters.date_to
  if (filters.status_ids.length) q.status_ids = filters.status_ids.join(',')
  if (filters.assigned_to) q.assigned_to = filters.assigned_to
  if (filters.created_by) q.created_by = filters.created_by
  if (filters.project_id) q.project_id = filters.project_id
  if (filters.sla_breach) q.sla_breach = '1'
  return { ...q, ...extra }
}

async function fetchTickets() {
  loading.value = true
  try {
    const res = await $fetch('/api/tickets', { query: buildQuery() }) as any
    tickets.value = res.data
    pagination.total = res.total ?? 0
    pagination.totalPages = res.totalPages ?? 1
    pagination.page = res.page ?? 1
    if (res.stats) stats.value = res.stats
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) { pagination.page = p; fetchTickets() }
function onLimitChange(l: number) { pagination.limit = l; pagination.page = 1; fetchTickets() }

watchDebounced(filters, () => { pagination.page = 1; fetchTickets() }, { debounce: 300, maxWait: 1000 })
onMounted(fetchTickets)

async function handleRefresh() {
  await fetchTickets()
}

function openTicket(t: any) {
  tabs.openTab(t)
}

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

async function exportExcel() {
  exporting.value = true
  try {
    const res = await $fetch('/api/tickets', { query: buildQuery({ limit: 9999, page: 1, export: '1' }) }) as any
    const rows = (res.data as any[]).map((t: any) => ({
      'Project': t.project_name,
      'Menu': t.system_menu_name || '—',
      'Dibuat Oleh': t.created_by_name,
      'Assignee': t.assigned_to_name || '—',
      'Kode': t.ticket_number,
      'Judul': t.title,
      'Status': t.status_name,
      'Tgl Buat': fmtDate(t.created_at),
      'Tgl Resolve': fmtDate(t.resolved_at || t.closed_at) || '—',
      'SLA': fmtDuration(t.created_at, t.resolved_at || t.closed_at),
      'SLA Breach': t.sla_breached ? 'Ya' : 'Tidak',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report Ticket')
    XLSX.writeFile(wb, `report-ticket-${filters.date_from}-${filters.date_to}.xlsx`)
  } finally {
    exporting.value = false
  }
}
</script>

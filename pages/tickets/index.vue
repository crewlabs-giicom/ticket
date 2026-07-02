<template>
  <div class="space-y-3">
    <!-- Source tabs (staff/admin only) -->
    <div v-if="auth.isStaffOrAdmin" class="flex items-center gap-1 border-b border-slate-200 -mb-px">
      <button
        v-for="tab in sourceTabs" :key="tab.value"
        @click="setSourceTab(tab.value)"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap', sourceTab === tab.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900']"
      >{{ tab.label }}</button>
    </div>

    <!-- Top bar -->
    <div class="flex items-center justify-between gap-2">
      <button @click="showFilters = !showFilters" class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 bg-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
        Filter
        <span v-if="activeFilterCount" class="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-indigo-600 text-white rounded-full">{{ activeFilterCount }}</span>
        <svg class="w-3 h-3 transition-transform" :class="showFilters ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="refreshing" @click="handleRefresh" />
        <button v-if="sourceTab !== 'qc'" @click="showForm = true" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Ticket Baru
        </button>
      </div>
    </div>

    <!-- Filter Card (collapsible) -->
    <div v-if="showFilters" class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
        <!-- Pencarian -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pencarian</label>
          <input v-model="filters.search" class="input text-sm" placeholder="Cari judul / nomor..." />
        </div>

        <!-- Status -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Status</label>
          <AppMultiSelect
            v-model="filters.status_ids"
            :options="statuses.map((s: any) => ({ value: s.id, label: s.name }))"
            placeholder="Semua Status"
          />
        </div>

        <!-- Priority -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Priority</label>
          <AppMultiSelect
            v-model="filters.priority_ids"
            :options="priorities.map((p: any) => ({ value: p.id, label: p.name }))"
            placeholder="Semua Priority"
          />
        </div>

        <!-- Project -->
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Project</label>
          <AppSelect
            v-model="filters.project_id"
            :options="[{ value: '', label: 'Semua Project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
            placeholder="Semua Project"
          />
        </div>

        <!-- Assignee (staff only) -->
        <div v-if="auth.isStaffOrAdmin" class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Assignee</label>
          <AppSelect
            v-model="filters.assigned_to"
            :options="[{ value: '', label: 'Semua Assignee' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Semua Assignee"
          />
        </div>

        <!-- Tanggal -->
        <div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tanggal Dibuat</label>
          <div class="flex items-center gap-1.5">
            <input v-model="filters.date_from" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
            <span class="text-xs text-slate-400 flex-shrink-0">—</span>
            <input v-model="filters.date_to" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
          </div>
        </div>

        <!-- Due Date Extended -->
        <div class="flex flex-col gap-1 justify-end">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Due Date</label>
          <label class="flex items-center gap-2 cursor-pointer h-9 px-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors w-fit">
            <input v-model="filters.extended" type="checkbox" class="w-3.5 h-3.5 rounded accent-purple-500" />
            <span class="text-sm text-slate-600">Pernah diperpanjang</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Menu</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Priority</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Assigned</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading"><td colspan="7" class="text-center py-8 text-slate-400">Memuat...</td></tr>
            <tr v-else-if="!tickets.length"><td colspan="7" class="text-center py-8 text-slate-400">Tidak ada ticket</td></tr>
            <tr v-for="t in tickets" :key="t.id" @click="openTicket(t)" class="hover:bg-slate-50 cursor-pointer transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-start gap-2">
                  <span v-if="t.sla_breached" class="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <div class="flex items-center gap-1.5">
                    <p class="font-medium text-slate-900 text-xs">{{ t.ticket_number }}</p>
                    <span v-if="t.task_id" class="inline-flex items-center gap-0.5 text-[9px] font-medium bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      Task
                    </span>
                    <span v-if="t.source === 'qc'" class="inline-flex items-center text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">QC</span>
                    <span v-if="t.extended_due_date_history?.length" class="inline-flex items-center text-[9px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0 cursor-help" :title="extendedTooltip(t)">⏱ Extended ({{ t.extended_due_date_history.length }}x)</span>
                  </div>
                    <p class="text-slate-600 text-xs mt-0.5 line-clamp-1 max-w-xs">{{ t.title }}</p>
                    <div class="flex items-center gap-2 mt-1 md:hidden">
                      <span class="badge text-white text-[10px]" :style="{ background: t.status_color }">{{ t.status_name }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.project_name }}</span></td>
              <td class="px-4 py-3 hidden xl:table-cell"><span class="text-xs text-slate-500">{{ t.system_menu_name || '—' }}</span></td>
              <td class="px-4 py-3 hidden md:table-cell"><span class="badge text-white text-[10px]" :style="{ background: t.status_color }">{{ t.status_name }}</span></td>
              <td class="px-4 py-3 hidden lg:table-cell" @click.stop>
                <div v-if="auth.isStaffOrAdmin" class="flex items-center gap-1.5">
                  <span class="priority-dot flex-shrink-0" :style="{ background: t.priority_color }" />
                  <select
                    :value="t.priority_id"
                    @change="updatePriority(t, ($event.target as HTMLSelectElement).value)"
                    class="text-xs text-slate-600 bg-transparent border-none outline-none cursor-pointer hover:text-slate-900 max-w-[90px] truncate"
                  >
                    <option v-for="p in priorities" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>
                <div v-else class="flex items-center gap-1.5">
                  <span class="priority-dot" :style="{ background: t.priority_color }" />
                  <span class="text-xs text-slate-600">{{ t.priority_name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell"><span class="text-xs text-slate-500">{{ t.assigned_to_name || '—' }}</span></td>
              <td class="px-4 py-3 hidden xl:table-cell">
                <span class="text-xs" :class="t.sla_breached ? 'text-red-600 font-medium' : 'text-slate-500'">{{ fmtDate(t.due_date) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="pagination.page" :total-pages="pagination.totalPages" :total="pagination.total" :limit="pagination.limit" @page-change="onPageChange" @limit-change="onLimitChange" />
    </div>

    <!-- Create Ticket Modal -->
    <TicketFormModal v-if="showForm" @close="showForm = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { fmtDate } = useDate()
function extendedTooltip(t: any) {
  return (t.extended_due_date_history || []).map((h: any) => h.label).join('\n')
}
const tabs = useTabStore()
const auth = useAuthStore()
const showForm = ref(false)
const showFilters = ref(true)
const loading = ref(false)
const tickets = ref<any[]>([])

const sourceTabs = [
  { value: 'user', label: 'Ticket User' },
  { value: 'qc', label: 'Ticket QC' },
]
const sourceTab = ref<'user' | 'qc'>('user')
function setSourceTab(v: 'user' | 'qc') {
  sourceTab.value = v
  pagination.page = 1
  fetchTickets()
}

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.search) n++
  if (filters.status_ids.length) n++
  if (filters.priority_ids.length) n++
  if (filters.project_id) n++
  if (filters.assigned_to) n++
  if (filters.extended) n++
  return n
})

const today = new Date()
const oneMonthAgo = new Date(today)
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

const filters = reactive({
  search: '',
  status_ids: [] as number[],
  priority_ids: [] as number[],
  project_id: '',
  assigned_to: '',
  date_from: toDateStr(oneMonthAgo),
  date_to: toDateStr(today),
  extended: false,
})
const pagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 10 })

const { data: sd } = await useFetch('/api/statuses')
const { data: pd } = await useFetch('/api/priorities')
const { data: prd } = await useFetch('/api/projects')
const { data: ud } = await useFetch('/api/users', { query: { role: 'staff', limit: 200 } })
const statuses = computed(() => (sd.value as any)?.data || [])
const priorities = computed(() => (pd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data || [])
const staffUsers = computed(() => (ud.value as any)?.data || [])

// Default: all statuses except closed
watch(statuses, (val) => {
  if (val.length && !filters.status_ids.length) {
    filters.status_ids = val.filter((s: any) => !/closed/i.test(s.name)).map((s: any) => s.id)
  }
}, { immediate: true, once: true })

async function fetchTickets() {
  loading.value = true
  try {
    const q: Record<string, any> = { page: pagination.page, limit: pagination.limit }
    if (filters.search) q.search = filters.search
    if (filters.status_ids.length) q.status_ids = filters.status_ids.join(',')
    if (filters.priority_ids.length) q.priority_ids = filters.priority_ids.join(',')
    if (filters.project_id) q.project_id = filters.project_id
    if (filters.assigned_to) q.assigned_to = filters.assigned_to
    if (filters.date_from) q.date_from = filters.date_from
    if (filters.date_to) q.date_to = filters.date_to
    if (filters.extended) q.extended = '1'
    if (auth.isStaffOrAdmin) q.source = sourceTab.value
    const res = await $fetch('/api/tickets', { query: q }) as any
    tickets.value = res.data
    pagination.total = res.total ?? 0
    pagination.totalPages = res.totalPages ?? 1
    pagination.page = res.page ?? 1
  } finally { loading.value = false }
}

function onPageChange(p: number) { pagination.page = p; fetchTickets() }
function onLimitChange(l: number) { pagination.limit = l; pagination.page = 1; fetchTickets() }
watchDebounced(filters, () => { pagination.page = 1; fetchTickets() }, { debounce: 300, maxWait: 1000 })

const refreshing = ref(false)
async function handleRefresh() {
  refreshing.value = true
  await fetchTickets()
  refreshing.value = false
}
onMounted(fetchTickets)

function openTicket(t: any) { tabs.openTab(t) }
function onCreated() { showForm.value = false; fetchTickets() }

async function updatePriority(ticket: any, priorityId: string | number) {
  const pid = Number(priorityId)
  if (pid === ticket.priority_id) return
  const pri = priorities.value.find((p: any) => p.id === pid)
  ticket.priority_id = pid
  ticket.priority_name = pri?.name ?? ticket.priority_name
  ticket.priority_color = pri?.color ?? ticket.priority_color
  await $fetch(`/api/tickets/${ticket.id}`, { method: 'PUT', body: { priority_id: pid } })
}
</script>

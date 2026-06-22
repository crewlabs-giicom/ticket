<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="filters.search" class="input w-48" placeholder="Cari ticket..." />
        <AppSelect
          v-model="filters.status_id"
          :options="[{ value: '', label: 'Semua Status' }, ...statuses.map((s: any) => ({ value: s.id, label: s.name }))]"
          placeholder="Semua Status"
          class="w-40"
        />
        <AppSelect
          v-model="filters.priority_id"
          :options="[{ value: '', label: 'Semua Priority' }, ...priorities.map((p: any) => ({ value: p.id, label: p.name }))]"
          placeholder="Semua Priority"
          class="w-40"
        />
        <AppSelect
          v-model="filters.project_id"
          :options="[{ value: '', label: 'Semua Project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
          placeholder="Semua Project"
          class="w-40"
        />
      </div>
      <button @click="showForm = true" class="btn-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Ticket Baru
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Project</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Priority</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Assigned</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Menu</th>
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
                    <p class="font-medium text-slate-900 text-xs">{{ t.ticket_number }}</p>
                    <p class="text-slate-600 text-xs mt-0.5 line-clamp-1 max-w-xs">{{ t.title }}</p>
                    <div class="flex items-center gap-2 mt-1 md:hidden">
                      <span class="badge text-white text-[10px]" :style="{ background: t.status_color }">{{ t.status_name }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden md:table-cell"><span class="text-xs text-slate-500">{{ t.project_name }}</span></td>
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
              <td class="px-4 py-3 hidden xl:table-cell"><span class="text-xs text-slate-500">{{ t.system_menu_name || '—' }}</span></td>
              <td class="px-4 py-3 hidden xl:table-cell">
                <span class="text-xs" :class="t.sla_breached ? 'text-red-600 font-medium' : 'text-slate-500'">{{ t.due_date ? new Date(t.due_date).toLocaleDateString('id') : '—' }}</span>
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
const tabs = useTabStore()
const auth = useAuthStore()
const showForm = ref(false)
const loading = ref(false)
const tickets = ref<any[]>([])

const filters = reactive({ search: '', status_id: '', priority_id: '', project_id: '' })
const pagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 10 })

const { data: sd } = await useFetch('/api/statuses')
const { data: pd } = await useFetch('/api/priorities')
const { data: prd } = await useFetch('/api/projects')
const statuses = computed(() => (sd.value as any)?.data || [])
const priorities = computed(() => (pd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data || [])

async function fetchTickets() {
  loading.value = true
  try {
    const q = { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')), page: pagination.page, limit: pagination.limit }
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
await fetchTickets()

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

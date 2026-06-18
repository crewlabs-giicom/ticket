<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="filters.search" class="input w-48" placeholder="Cari ticket..." />
        <select v-model="filters.status_id" class="input w-36">
          <option value="">Semua Status</option>
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="filters.priority_id" class="input w-36">
          <option value="">Semua Priority</option>
          <option v-for="p in priorities" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <select v-model="filters.project_id" class="input w-36">
          <option value="">Semua Project</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
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
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading"><td colspan="6" class="text-center py-8 text-slate-400">Memuat...</td></tr>
            <tr v-else-if="!tickets.length"><td colspan="6" class="text-center py-8 text-slate-400">Tidak ada ticket</td></tr>
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
              <td class="px-4 py-3 hidden lg:table-cell">
                <div class="flex items-center gap-1.5">
                  <span class="priority-dot" :style="{ background: t.priority_color }" />
                  <span class="text-xs text-slate-600">{{ t.priority_name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell"><span class="text-xs text-slate-500">{{ t.assigned_to_name || '—' }}</span></td>
              <td class="px-4 py-3 hidden xl:table-cell">
                <span class="text-xs" :class="t.sla_breached ? 'text-red-600 font-medium' : 'text-slate-500'">{{ t.due_date ? new Date(t.due_date).toLocaleDateString('id') : '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Ticket Modal -->
    <TicketFormModal v-if="showForm" @close="showForm = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const tabs = useTabStore()
const showForm = ref(false)
const loading = ref(false)
const tickets = ref<any[]>([])

const filters = reactive({ search: '', status_id: '', priority_id: '', project_id: '' })

const { data: sd } = await useFetch('/api/statuses')
const { data: pd } = await useFetch('/api/priorities')
const { data: prd } = await useFetch('/api/projects')
const statuses = computed(() => (sd.value as any)?.data || [])
const priorities = computed(() => (pd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data || [])

async function fetchTickets() {
  loading.value = true
  try {
    const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    const res = await $fetch('/api/tickets', { query: q }) as any
    tickets.value = res.data
  } finally { loading.value = false }
}

watchDebounced(filters, fetchTickets, { debounce: 300, maxWait: 1000 })
await fetchTickets()

function openTicket(t: any) { tabs.openTab(t) }
function onCreated() { showForm.value = false; fetchTickets() }
</script>

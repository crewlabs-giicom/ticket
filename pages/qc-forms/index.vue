<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-slate-800">Form QC</h1>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="loading" @click="load" />
      </div>
    </div>

    <!-- Filter toggle bar -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <button @click="showFilters = !showFilters"
        class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 bg-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
        Filter
        <span v-if="activeFilterCount" class="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-indigo-600 text-white rounded-full">{{ activeFilterCount }}</span>
        <svg class="w-3 h-3 transition-transform" :class="showFilters ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <span class="text-xs text-slate-400">{{ total }} form ditemukan</span>
    </div>

    <!-- Filter Card -->
    <div v-if="showFilters" class="card p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
        <!-- Search -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Pencarian</label>
          <input v-model="filters.search" class="input text-sm" placeholder="Cari task / project..." />
        </div>

        <!-- Status -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
          <AppSelect v-model="filters.status"
            :options="[
              { value: '', label: 'Semua Status' },
              { value: 'active', label: 'Active' },
              { value: 'approved', label: 'Approved' },
              { value: 'looped', label: 'Looped' },
            ]"
            placeholder="Semua Status" />
        </div>

        <!-- Project -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Project</label>
          <AppSelect v-model="filters.project_id"
            :options="[{ value: '', label: 'Semua Project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
            placeholder="Semua Project" />
        </div>

        <!-- Checker -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Checker</label>
          <AppSelect v-model="filters.checker_id"
            :options="[{ value: '', label: 'Semua Checker' }, ...staffUsers.map(u => ({ value: u.id, label: u.name }))]"
            placeholder="Semua Checker" />
        </div>

        <!-- Template -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Template</label>
          <AppSelect v-model="filters.template_id"
            :options="[{ value: '', label: 'Semua Template' }, { value: 'none', label: 'Tanpa Template' }, ...templates.map(t => ({ value: t.id, label: t.name }))]"
            placeholder="Semua Template" />
        </div>

        <!-- Date range -->
        <div>
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Tanggal Dibuat</label>
          <div class="flex items-center gap-1.5">
            <input v-model="filters.date_from" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
            <span class="text-xs text-slate-400 flex-shrink-0">—</span>
            <input v-model="filters.date_to" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
          </div>
        </div>

        <!-- Loop only -->
        <div class="flex items-end pb-1">
          <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
            <input type="checkbox" v-model="filters.loop_only" class="rounded accent-indigo-600" />
            Hanya Loop QC
          </label>
        </div>

        <!-- Reset -->
        <div class="flex items-end">
          <button @click="resetFilters" class="text-xs text-slate-500 hover:text-slate-700 underline">Reset filter</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-center py-12 text-slate-400">Memuat...</div>
    <div v-else-if="!forms.length" class="text-center py-12 text-slate-400">Tidak ada form QC.</div>
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Form</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Task</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Project</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Template</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Checker</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Progress</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Tanggal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="f in forms" :key="f.id"
            class="hover:bg-slate-50 transition-colors cursor-pointer"
            @click="navigateTo(`/qc-forms/${f.id}`)">
            <td class="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
              #QC-{{ f.id }}
              <span v-if="f.sequence > 1" class="ml-1 text-orange-500 font-medium">Loop {{ f.sequence }}</span>
            </td>
            <td class="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
              <div class="truncate">{{ f.task_title }}</div>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ f.project_name || '—' }}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">{{ f.template_name || '—' }}</td>
            <td class="px-4 py-3 text-slate-500 text-xs max-w-[160px]">
              <div class="truncate">{{ f.checker_names || '—' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-100 rounded-full h-1.5 w-16">
                  <div class="bg-emerald-500 h-1.5 rounded-full transition-all"
                    :style="{ width: f.checker_count ? `${(f.done_count / f.checker_count) * 100}%` : '0%' }"></div>
                </div>
                <span class="text-xs text-slate-500 whitespace-nowrap">{{ f.done_count }}/{{ f.checker_count }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(f.status)"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize">
                {{ f.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{{ formatDate(f.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-sm text-slate-500">Page {{ page }} of {{ totalPages }} ({{ total }} total)</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" @click="page--; load()" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
        <button :disabled="page >= totalPages" @click="page++; load()" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const showFilters = ref(true)
const forms = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const projects = ref<any[]>([])
const staffUsers = ref<any[]>([])
const templates = ref<any[]>([])

const filters = reactive({
  search: '',
  status: '',
  project_id: '' as any,
  checker_id: '' as any,
  template_id: '' as any,
  date_from: '',
  date_to: '',
  loop_only: false,
})

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.search) n++
  if (filters.status) n++
  if (filters.project_id) n++
  if (filters.checker_id) n++
  if (filters.template_id) n++
  if (filters.date_from || filters.date_to) n++
  if (filters.loop_only) n++
  return n
})

async function load() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 50 }
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.project_id) params.project_id = filters.project_id
    if (filters.checker_id) params.checker_id = filters.checker_id
    if (filters.template_id) params.template_id = filters.template_id
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.loop_only) params.loop_only = '1'
    const res = await $fetch<any>('/api/qc-forms', { params })
    forms.value = res?.data || []
    total.value = res?.total || 0
    totalPages.value = res?.totalPages || 1
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, { search: '', status: '', project_id: '', checker_id: '', template_id: '', date_from: '', date_to: '', loop_only: false })
}

function statusClass(s: string) {
  if (s === 'active') return 'bg-blue-100 text-blue-700'
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (s === 'looped') return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadMeta() {
  const [p, u, t] = await Promise.all([
    $fetch<any>('/api/projects', { params: { limit: 200 } }),
    $fetch<any>('/api/users', { params: { limit: 200 } }),
    $fetch<any>('/api/qc-templates'),
  ])
  projects.value = p?.data || p || []
  staffUsers.value = (u?.data || []).filter((x: any) => x.is_active)
  templates.value = t?.data || t || []
}

watch(filters, () => { page.value = 1; load() }, { deep: true })

onMounted(() => {
  load()
  loadMeta()
})
</script>

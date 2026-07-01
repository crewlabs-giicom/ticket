<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">PRDs</h1>
        <p class="text-sm text-gray-500 mt-1">Product Requirements Documents</p>
      </div>
      <button v-if="authStore.isStaffOrAdmin" @click="showCreateModal = true" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New PRD
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <AppSelect
        v-model="filterStatus"
        :options="[{ value: '', label: 'All Status' }, ...prdStatuses]"
        placeholder="All Status"
        class="w-40"
      />
      <AppSelect
        v-model="filterProject"
        :options="[{ value: '', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
        placeholder="All Projects"
        class="w-44"
      />
      <input v-model="filterSearch" type="text" placeholder="Search..." class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48" />
    </div>

    <!-- Grid -->
    <div v-if="loading" class="text-center py-12 text-gray-400">Loading...</div>
    <div v-else-if="!prds.length" class="text-center py-12 text-gray-400">No PRDs found</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="prd in prds"
        :key="prd.id"
        :to="`/prds/${prd.id}`"
        class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all block"
      >
        <div class="flex items-start justify-between mb-3">
          <span class="text-xs font-mono text-gray-400">PRD-{{ prd.id }}</span>
          <span :class="prdStatusClass(prd.status)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ prd.status.replace('_', ' ') }}</span>
        </div>
        <h3 class="font-semibold text-gray-900 mb-1 line-clamp-2">{{ prd.title }}</h3>
        <p class="text-xs text-gray-500 mb-3">{{ prd.project_name }}</p>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span v-if="prd.current_version_number" class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">v{{ prd.current_version_number }}</span>
          <span v-else class="text-gray-300">no version</span>
          <span>{{ prd.request_count }} request(s)</span>
        </div>
        <div class="mt-2 text-xs text-gray-400">by {{ prd.created_by_name }} · {{ fmtDate(prd.created_at) }}</div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-6">
      <span class="text-sm text-gray-500">Page {{ page }} of {{ totalPages }}</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" @click="page--" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
        <button :disabled="page >= totalPages" @click="page++" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">New PRD</h2>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
            <input v-model="form.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="PRD title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project <span class="text-red-500">*</span></label>
            <AppSelect
              v-model="form.project_id"
              :options="[{ value: '', label: 'Select project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
              placeholder="Select project"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Background</label>
            <textarea v-model="form.background" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Background / context..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Goals</label>
            <textarea v-model="form.goals" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Goals & success metrics..." />
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="createPrd" :disabled="creating" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ creating ? 'Creating...' : 'Create PRD' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const prds = ref<any[]>([])
const projects = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)

const filterStatus = ref('')
const filterProject = ref('')
const filterSearch = ref('')

const showCreateModal = ref(false)
const creating = ref(false)
const form = ref({ title: '', project_id: '', background: '', goals: '' })

const prdStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

function prdStatusClass(s: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    in_review: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    done: 'bg-emerald-100 text-emerald-700',
  }
  return map[s] || 'bg-gray-100 text-gray-600'
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadPrds() {
  loading.value = true
  try {
    const q: any = { page: page.value, limit: 50 }
    if (filterStatus.value) q.status = filterStatus.value
    if (filterProject.value) q.project_id = filterProject.value
    if (filterSearch.value) q.search = filterSearch.value
    const res = await $fetch<any>('/api/prds', { query: q })
    prds.value = res.data
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  const res = await $fetch<any>('/api/projects', { query: { limit: 200 } })
  projects.value = res.data || res
}

async function createPrd() {
  if (!form.value.title.trim() || !form.value.project_id) return
  creating.value = true
  try {
    const prd = await $fetch<any>('/api/prds', { method: 'POST', body: form.value })
    showCreateModal.value = false
    form.value = { title: '', project_id: '', background: '', goals: '' }
    navigateTo(`/prds/${prd.id}`)
  } finally {
    creating.value = false
  }
}

watch([filterStatus, filterProject, filterSearch, page], loadPrds)
onMounted(() => { loadPrds(); loadProjects() })
</script>

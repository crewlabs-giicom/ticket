<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Requests</h1>
        <p class="text-sm text-gray-500 mt-1">Manage feature & change requests</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="authStore.isStaffOrAdmin && selectedIds.length > 0"
          @click="showGroupModal = true"
          class="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          Group to PRD ({{ selectedIds.length }})
        </button>
        <button @click="showCreateModal = true" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Request
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <AppSelect
        v-model="filterStatus"
        :options="[{ value: '', label: 'All Status' }, ...statuses]"
        placeholder="All Status"
        class="w-40"
      />
      <AppSelect
        v-model="filterProject"
        :options="[{ value: '', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
        placeholder="All Projects"
        class="w-44"
      />
      <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" v-model="filterUnassigned" class="rounded accent-indigo-600" />
        Unassigned to PRD
      </label>
      <input v-model="filterSearch" type="text" placeholder="Search..." class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48" />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th v-if="authStore.isStaffOrAdmin" class="px-4 py-3 text-left w-8">
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="rounded accent-indigo-600" />
            </th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Title</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Project</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Requester</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Urgency</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">PRD</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Created</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="authStore.isStaffOrAdmin ? 9 : 7" class="px-4 py-8 text-center text-gray-400">Loading...</td>
          </tr>
          <tr v-else-if="!requests.length">
            <td :colspan="authStore.isStaffOrAdmin ? 9 : 7" class="px-4 py-8 text-center text-gray-400">No requests found</td>
          </tr>
          <tr v-for="r in requests" :key="r.id" class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" @click.stop="openViewModal(r)">
            <td v-if="authStore.isStaffOrAdmin" class="px-4 py-3" @click.stop>
              <input
                type="checkbox"
                :value="r.id"
                v-model="selectedIds"
                :disabled="r.status === 'rejected' || r.status === 'standalone'"
                class="rounded accent-indigo-600"
              />
            </td>
            <td class="px-4 py-3 font-medium text-gray-900 max-w-xs">
              <div class="truncate">{{ r.title }}</div>
              <div v-if="r.description" class="text-xs text-gray-400 truncate">{{ r.description }}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ r.project_name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ r.requester_name }}</td>
            <td class="px-4 py-3">
              <span :class="urgencyClass(r.urgency)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ r.urgency }}</span>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(r.status)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ r.status.replace('_', ' ') }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">
              <NuxtLink v-if="r.prd_id" :to="`/prds/${r.prd_id}`" class="text-indigo-600 hover:underline text-xs">
                PRD-{{ r.prd_id }}
              </NuxtLink>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{{ fmtDate(r.created_at) }}</td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex items-center gap-1">
                <button
                  v-if="canEdit(r)"
                  @click="openEditModal(r)"
                  class="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                >Edit</button>
                <template v-if="authStore.isStaffOrAdmin">
                  <button
                    v-if="r.status !== 'rejected'"
                    @click="setStatus(r, 'reject')"
                    class="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                  >Reject</button>
                  <button
                    v-if="r.status !== 'standalone'"
                    @click="setStatus(r, 'standalone')"
                    class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >Standalone</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-sm text-gray-500">Page {{ page }} of {{ totalPages }} ({{ total }} total)</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" @click="page--" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
        <button :disabled="page >= totalPages" @click="page++" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">New Request</h2>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
            <input v-model="form.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Request title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Describe the request..." />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project <span class="text-red-500">*</span></label>
              <AppSelect
                v-model="form.project_id"
                :options="[{ value: '', label: 'Select project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
                placeholder="Select project"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <AppSelect
                v-model="form.urgency"
                :options="[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]"
                placeholder="Urgency"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="createRequest" :disabled="creating" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ creating ? 'Creating...' : 'Create Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Group to PRD Modal -->
    <div v-if="showGroupModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Group {{ selectedIds.length }} Request(s) to PRD</h2>
          <button @click="showGroupModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex gap-3">
            <button @click="groupMode = 'existing'" :class="['flex-1 py-2 text-sm rounded-lg border transition-colors', groupMode === 'existing' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50']">Existing PRD</button>
            <button @click="groupMode = 'new'" :class="['flex-1 py-2 text-sm rounded-lg border transition-colors', groupMode === 'new' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50']">Create New PRD</button>
          </div>

          <div v-if="groupMode === 'existing'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select PRD</label>
            <AppSelect
              v-model="groupPrdId"
              :options="[{ value: '', label: 'Select a PRD...' }, ...availablePrds.map(p => ({ value: p.id, label: `PRD-${p.id}: ${p.title}` }))]"
              placeholder="Select a PRD..."
            />
          </div>

          <div v-else class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">PRD Title <span class="text-red-500">*</span></label>
              <input v-model="newPrdForm.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="PRD title" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project <span class="text-red-500">*</span></label>
              <AppSelect
                v-model="newPrdForm.project_id"
                :options="[{ value: '', label: 'Select project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
                placeholder="Select project"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showGroupModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="doGroup" :disabled="grouping" class="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {{ grouping ? 'Grouping...' : 'Group Requests' }}
          </button>
        </div>
      </div>
    </div>
    <!-- View Modal -->
    <div v-if="showViewModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click.self="showViewModal = false">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Detail Request</h2>
          <button @click="showViewModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div v-if="viewingRequest" class="p-6 space-y-4">
          <div>
            <p class="text-xs text-gray-400 mb-1">Title</p>
            <p class="font-semibold text-gray-900">{{ viewingRequest.title }}</p>
          </div>
          <div v-if="viewingRequest.description">
            <p class="text-xs text-gray-400 mb-1">Description</p>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ viewingRequest.description }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-400 mb-1">Project</p>
              <p class="text-sm text-gray-700">{{ viewingRequest.project_name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Requester</p>
              <p class="text-sm text-gray-700">{{ viewingRequest.requester_name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Urgency</p>
              <span :class="urgencyClass(viewingRequest.urgency)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ viewingRequest.urgency }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Status</p>
              <span :class="statusClass(viewingRequest.status)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ viewingRequest.status.replace('_', ' ') }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">PRD</p>
              <NuxtLink v-if="viewingRequest.prd_id" :to="`/prds/${viewingRequest.prd_id}`" class="text-indigo-600 hover:underline text-sm" @click="showViewModal = false">
                PRD-{{ viewingRequest.prd_id }}
              </NuxtLink>
              <span v-else class="text-sm text-gray-400">—</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Dibuat</p>
              <p class="text-sm text-gray-700">{{ fmtDate(viewingRequest.created_at) }}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showViewModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
          <button v-if="canEdit(viewingRequest)" @click="showViewModal = false; openEditModal(viewingRequest)"
            class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Edit</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Edit Request</h2>
          <button @click="showEditModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
            <input v-model="editForm.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Request title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="editForm.description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Describe the request..." />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project <span class="text-red-500">*</span></label>
              <AppSelect
                v-model="editForm.project_id"
                :options="[{ value: '', label: 'Select project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
                placeholder="Select project"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <AppSelect
                v-model="editForm.urgency"
                :options="[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]"
                placeholder="Urgency"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showEditModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="saveEdit" :disabled="saving" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const requests = ref<any[]>([])
const projects = ref<any[]>([])
const availablePrds = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)

const filterStatus = ref('')
const filterProject = ref('')
const filterUnassigned = ref(false)
const filterSearch = ref('')

const selectedIds = ref<number[]>([])
const showCreateModal = ref(false)
const showGroupModal = ref(false)
const showEditModal = ref(false)
const showViewModal = ref(false)
const viewingRequest = ref<any>(null)
const creating = ref(false)
const grouping = ref(false)
const saving = ref(false)
const editingRequest = ref<any>(null)
const editForm = ref({ title: '', description: '', project_id: '' as any, urgency: 'medium' })
const groupMode = ref<'existing'|'new'>('existing')
const groupPrdId = ref('')

const form = ref({ title: '', description: '', project_id: '', urgency: 'medium' })
const newPrdForm = ref({ title: '', project_id: '' })

const statuses = [
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'standalone', label: 'Standalone' },
]

const allSelected = computed(() =>
  requests.value.filter(r => r.status !== 'rejected' && r.status !== 'standalone').every(r => selectedIds.value.includes(r.id))
)

function toggleSelectAll() {
  const eligible = requests.value.filter(r => r.status !== 'rejected' && r.status !== 'standalone').map(r => r.id)
  if (allSelected.value) selectedIds.value = []
  else selectedIds.value = eligible
}

function urgencyClass(u: string) {
  return { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' }[u] || 'bg-gray-100 text-gray-700'
}

function statusClass(s: string) {
  const map: Record<string, string> = {
    under_review: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    done: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    standalone: 'bg-gray-100 text-gray-700',
  }
  return map[s] || 'bg-gray-100 text-gray-700'
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadRequests() {
  loading.value = true
  try {
    const q: any = { page: page.value, limit: 50 }
    if (filterStatus.value) q.status = filterStatus.value
    if (filterProject.value) q.project_id = filterProject.value
    if (filterUnassigned.value) q.unassigned = '1'
    if (filterSearch.value) q.search = filterSearch.value
    const res = await $fetch<any>('/api/requests', { query: q })
    requests.value = res.data
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

async function loadPrds() {
  const res = await $fetch<any>('/api/prds', { query: { limit: 200 } })
  availablePrds.value = res.data
}

async function createRequest() {
  if (!form.value.title.trim() || !form.value.project_id) return
  creating.value = true
  try {
    await $fetch('/api/requests', { method: 'POST', body: form.value })
    showCreateModal.value = false
    form.value = { title: '', description: '', project_id: '', urgency: 'medium' }
    await loadRequests()
  } finally {
    creating.value = false
  }
}

function openViewModal(r: any) {
  viewingRequest.value = r
  showViewModal.value = true
}

function canEdit(r: any) {
  return !r.prd_id && r.status !== 'rejected' && r.status !== 'standalone'
}

function openEditModal(r: any) {
  editingRequest.value = r
  editForm.value = { title: r.title, description: r.description || '', project_id: r.project_id, urgency: r.urgency }
  showEditModal.value = true
}

async function saveEdit() {
  if (!editForm.value.title.trim() || !editingRequest.value) return
  saving.value = true
  try {
    await $fetch(`/api/requests/${editingRequest.value.id}`, { method: 'PATCH', body: editForm.value })
    showEditModal.value = false
    await loadRequests()
  } finally {
    saving.value = false
  }
}

async function setStatus(r: any, action: 'reject' | 'standalone') {
  await $fetch(`/api/requests/${r.id}/${action}`, { method: 'PATCH' })
  await loadRequests()
}

async function doGroup() {
  if (!selectedIds.value.length) return
  grouping.value = true
  try {
    let prdId = groupPrdId.value
    if (groupMode.value === 'new') {
      if (!newPrdForm.value.title.trim() || !newPrdForm.value.project_id) return
      const prd = await $fetch<any>('/api/prds', { method: 'POST', body: newPrdForm.value })
      prdId = prd.id
    }
    if (!prdId) return
    await $fetch(`/api/prds/${prdId}/group-requests`, { method: 'PATCH', body: { requestIds: selectedIds.value } })
    showGroupModal.value = false
    selectedIds.value = []
    newPrdForm.value = { title: '', project_id: '' }
    groupPrdId.value = ''
    await loadRequests()
    await loadPrds()
  } finally {
    grouping.value = false
  }
}

watch([filterStatus, filterProject, filterUnassigned, filterSearch, page], loadRequests)
watch(showGroupModal, (v) => { if (v) loadPrds() })

onMounted(() => {
  loadRequests()
  loadProjects()
})
</script>

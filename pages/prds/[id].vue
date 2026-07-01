<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div v-if="loading" class="text-center py-16 text-gray-400">Loading...</div>
    <template v-else-if="prd">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink to="/prds" class="text-sm text-indigo-600 hover:underline">PRDs</NuxtLink>
            <span class="text-gray-400">/</span>
            <span class="text-sm text-gray-500">PRD-{{ prd.id }}</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ prd.title }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ prd.project_name }} · by {{ prd.created_by_name }} · {{ fmtDate(prd.created_at) }}</p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <AppRefreshButton :loading="loading" @click="loadPrd" />
          <!-- Version selector -->
          <AppSelect
            v-model="selectedVersionId"
            :options="prd.versions.map((v: any) => ({ value: v.id, label: `v${v.version_number}${v.id === prd.current_version_id ? ' (active)' : ''}` }))"
            placeholder="Pilih versi"
            class="w-36"
          />
          <!-- Status -->
          <AppSelect
            v-if="authStore.isStaffOrAdmin"
            :model-value="prd.status"
            :options="prdStatuses"
            placeholder="Status"
            class="w-36"
            @update:model-value="updateStatus($event)"
          />
          <span v-else :class="prdStatusClass(prd.status)" class="px-3 py-1 rounded-full text-sm font-medium">{{ prd.status.replace('_', ' ') }}</span>
          <button
            v-if="authStore.isStaffOrAdmin"
            @click="showNewVersionModal = true"
            class="px-4 py-2 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
          >New Version</button>
        </div>
      </div>

      <!-- Participants -->
      <div class="flex items-center gap-3 mb-5 flex-wrap">
        <span class="text-xs font-medium text-gray-500 flex-shrink-0">Peserta</span>
        <div class="flex flex-wrap gap-1.5 flex-1">
          <div v-for="p in prdParticipants" :key="p.user_id" class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 text-xs text-slate-700">
            <div class="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 overflow-hidden flex-shrink-0">
              <img v-if="p.avatar" :src="`/uploads/${p.avatar}`" class="w-full h-full object-cover" />
              <span v-else>{{ p.name?.charAt(0) }}</span>
            </div>
            <span>{{ p.name }}</span>
            <button v-if="authStore.isStaffOrAdmin" @click="removeParticipant(p.user_id)" class="text-slate-300 hover:text-red-500 transition-colors ml-0.5">✕</button>
          </div>
          <span v-if="!prdParticipants.length" class="text-xs text-gray-400 italic">Belum ada peserta</span>
        </div>
        <button v-if="authStore.isStaffOrAdmin" @click="showInviteModal = true" class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 flex-shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Undang
        </button>
      </div>

      <!-- Invite Modal -->
      <div v-if="showInviteModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm">
          <div class="flex items-center justify-between px-5 py-4 border-b">
            <h3 class="text-sm font-semibold text-slate-900">Undang Peserta</h3>
            <button @click="showInviteModal = false; inviteSearch = ''; inviteResults = []" class="text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-4 space-y-3">
            <input
              v-model="inviteSearch"
              @input="searchUsers"
              type="text"
              placeholder="Cari nama atau email..."
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div class="max-h-52 overflow-y-auto space-y-1">
              <div v-if="!inviteResults.length && inviteSearch.length >= 2" class="text-xs text-center text-gray-400 py-4">Tidak ada user ditemukan</div>
              <div v-for="u in inviteResults" :key="u.id" class="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50">
                <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden flex-shrink-0">
                  <img v-if="u.avatar" :src="`/uploads/${u.avatar}`" class="w-full h-full object-cover" />
                  <span v-else>{{ u.name?.charAt(0) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 truncate">{{ u.name }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ u.email }} · {{ u.role }}</p>
                </div>
                <button
                  v-if="!isAlreadyParticipant(u.id)"
                  @click="addParticipant(u)"
                  class="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-shrink-0"
                >+ Undang</button>
                <span v-else class="text-xs text-slate-400 flex-shrink-0">Sudah</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px', activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700']"
        >{{ tab.label }}<span v-if="tab.count !== undefined" class="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{{ tab.count }}</span></button>
      </div>

      <!-- Tab: Content -->
      <div v-if="activeTab === 'content'">
        <div v-if="selectedVersion" class="space-y-6">
          <div v-if="selectedVersion.id !== prd.current_version_id" class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Viewing v{{ selectedVersion.version_number }} (not the active version). Switch to v{{ prd.current_version_number }} to edit.
          </div>
          <div v-for="field in contentFields" :key="field.key" class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-700">{{ field.label }}</h3>
              <button
                v-if="authStore.isStaffOrAdmin && selectedVersion.id === prd.current_version_id && !editingField"
                @click="startEdit(field.key)"
                class="text-xs text-indigo-600 hover:underline"
              >Edit</button>
            </div>
            <div v-if="editingField === field.key">
              <textarea
                v-model="editValue"
                rows="5"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div class="flex gap-2 mt-2">
                <button @click="saveField(field.key)" :disabled="saving" class="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Save</button>
                <button @click="cancelEdit" class="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
            <p v-else class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedVersion[field.key] || '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Tab: Milestones & Tasks -->
      <div v-if="activeTab === 'milestones'">
        <div class="flex justify-between items-center mb-4">
          <p class="text-sm text-gray-500">Milestones for the active version</p>
          <button
            v-if="authStore.isStaffOrAdmin"
            @click="showMilestoneModal = true"
            class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Milestone
          </button>
        </div>

        <div v-if="!prd.milestones.length" class="text-center py-10 text-gray-400 bg-white border border-gray-200 rounded-xl">No milestones yet</div>

        <div class="space-y-4">
          <div v-for="m in prd.milestones" :key="m.id" class="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <!-- Milestone header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                <h3 class="font-semibold text-gray-900">{{ m.name }}</h3>
                <span v-if="m.due_date" :class="['text-xs px-2 py-0.5 rounded-full', isMilestoneOverdue(m) ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600']">
                  Due {{ fmtDate(m.due_date) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Progress bubble -->
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                  <span class="font-medium text-emerald-600">{{ m.tasks.filter((t: any) => t.status === 'done').length }}</span>
                  <span class="text-gray-300">/</span>
                  <span>{{ m.tasks.length }} task</span>
                  <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden ml-1">
                    <div
                      class="h-full bg-emerald-500 rounded-full transition-all"
                      :style="{ width: m.tasks.length ? (m.tasks.filter((t: any) => t.status === 'done').length / m.tasks.length * 100) + '%' : '0%' }"
                    ></div>
                  </div>
                </div>
                <button
                  v-if="authStore.isStaffOrAdmin"
                  @click="openGenerateTask(m)"
                  class="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >+ Task</button>
              </div>
            </div>

            <!-- Task list -->
            <div v-if="m.tasks.length" class="divide-y divide-gray-50">
              <div
                v-for="task in m.tasks"
                :key="task.id"
                class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <!-- Status dot -->
                <span :class="['w-2 h-2 rounded-full flex-shrink-0', taskStatusDot(task.status)]"></span>

                <div class="flex-1 min-w-0">
                  <p :class="['text-sm font-medium truncate', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800']">{{ task.title }}</p>
                  <p v-if="task.description" class="text-xs text-gray-400 truncate mt-0.5">{{ task.description }}</p>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', taskStatusClass(task.status)]">
                    {{ task.status.replace('_', ' ') }}
                  </span>
                  <span v-if="task.due_date" :class="['text-xs', isTaskOverdue(task) ? 'text-red-500 font-medium' : 'text-gray-400']">
                    {{ fmtDate(task.due_date) }}
                  </span>
                  <span
                    v-if="task.assigned_to_name"
                    class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold overflow-hidden"
                    :title="task.assigned_to_name"
                  >
                    <img v-if="task.assigned_to_avatar" :src="`/uploads/${task.assigned_to_avatar}`" class="w-full h-full object-cover" />
                    <span v-else>{{ initials(task.assigned_to_name) }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="px-5 py-4 text-sm text-gray-400 text-center">
              No tasks yet —
              <button v-if="authStore.isStaffOrAdmin" @click="openGenerateTask(m)" class="text-indigo-600 hover:underline">generate one</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Linked Requests -->
      <div v-if="activeTab === 'requests'">
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div v-if="!prd.requests.length" class="text-center py-10 text-gray-400">No requests linked</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Requester</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Urgency</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in prd.requests" :key="r.id" class="border-t border-gray-100 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{{ r.title }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.requester_name }}</td>
                <td class="px-4 py-3">
                  <span :class="urgencyClass(r.urgency)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ r.urgency }}</span>
                </td>
                <td class="px-4 py-3">
                  <span :class="reqStatusClass(r.status)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ r.status.replace('_', ' ') }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ fmtDate(r.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- New Version Modal -->
    <div v-if="showNewVersionModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Create New Version</h2>
          <button @click="showNewVersionModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-500">Content will be copied from the current active version. You can update fields below.</p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Changelog <span class="text-red-500">*</span></label>
            <textarea v-model="newVersionForm.changelog" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="What changed in this version?" />
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showNewVersionModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="createNewVersion" :disabled="creatingVersion" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ creatingVersion ? 'Creating...' : 'Create Version' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Milestone Modal -->
    <div v-if="showMilestoneModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Add Milestone</h2>
          <button @click="showMilestoneModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
            <input v-model="milestoneForm.name" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Milestone name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input v-model="milestoneForm.due_date" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showMilestoneModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="addMilestone" :disabled="addingMilestone" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ addingMilestone ? 'Adding...' : 'Add Milestone' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Generate Task Modal -->
    <div v-if="showGenTaskModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">Generate Task for "{{ genTaskMilestone?.name }}"</h2>
          <button @click="showGenTaskModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Task Title <span class="text-red-500">*</span></label>
            <input v-model="genTaskForm.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Task title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="genTaskForm.description" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input v-model="genTaskForm.due_date" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p class="text-xs text-gray-400 mt-1">Leave blank to inherit from milestone</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <AppSelect
                v-model="genTaskForm.assigned_to"
                :options="[{ value: '', label: 'Unassigned' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
                placeholder="Unassigned"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t">
          <button @click="showGenTaskModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button @click="generateTask" :disabled="generatingTask" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ generatingTask ? 'Creating...' : 'Generate Task' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const prdId = computed(() => Number(route.params.id))

const prd = ref<any>(null)
const loading = ref(true)
const activeTab = ref('content')
const selectedVersionId = ref<number | null>(null)
const editingField = ref<string | null>(null)
const editValue = ref('')
const saving = ref(false)

const showNewVersionModal = ref(false)
const creatingVersion = ref(false)
const newVersionForm = ref({ changelog: '' })

const showMilestoneModal = ref(false)
const addingMilestone = ref(false)
const milestoneForm = ref({ name: '', due_date: '' })

const showGenTaskModal = ref(false)
const generatingTask = ref(false)
const genTaskMilestone = ref<any>(null)
const genTaskForm = ref({ title: '', description: '', due_date: '', assigned_to: '' })
const staffUsers = ref<any[]>([])

const prdStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const contentFields = [
  { key: 'background', label: 'Background' },
  { key: 'goals', label: 'Goals' },
  { key: 'scope_in', label: 'Scope In' },
  { key: 'scope_out', label: 'Scope Out' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'technical_approach', label: 'Technical Approach' },
]

const tabs = computed(() => [
  { id: 'content', label: 'Content' },
  { id: 'milestones', label: 'Milestones & Tasks', count: prd.value?.milestones?.length },
  { id: 'requests', label: 'Linked Requests', count: prd.value?.requests?.length },
])

const selectedVersion = computed(() =>
  prd.value?.versions?.find((v: any) => v.id === selectedVersionId.value) ?? null
)

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

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

function urgencyClass(u: string) {
  return { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' }[u] || 'bg-gray-100 text-gray-700'
}

function reqStatusClass(s: string) {
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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function isMilestoneOverdue(m: any) {
  if (!m.due_date) return false
  return new Date(m.due_date) < new Date() && m.tasks.some((t: any) => t.status !== 'done')
}

function isTaskOverdue(task: any) {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date()
}

function taskStatusDot(s: string) {
  const map: Record<string, string> = {
    backlog: 'bg-gray-300', todo: 'bg-blue-400',
    in_progress: 'bg-indigo-500', review: 'bg-yellow-400', done: 'bg-emerald-500'
  }
  return map[s] || 'bg-gray-300'
}

function taskStatusClass(s: string) {
  const map: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-600', todo: 'bg-blue-50 text-blue-600',
    in_progress: 'bg-indigo-50 text-indigo-700', review: 'bg-yellow-50 text-yellow-700',
    done: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] || 'bg-gray-100 text-gray-600'
}

function startEdit(key: string) {
  editingField.value = key
  editValue.value = selectedVersion.value?.[key] ?? ''
}

function cancelEdit() {
  editingField.value = null
  editValue.value = ''
}

async function saveField(key: string) {
  if (!selectedVersion.value) return
  saving.value = true
  try {
    // Update via new version approach — patch current version content inline
    // We'll do a minimal PUT to save the field via patch version endpoint
    await $fetch(`/api/prds/${prdId.value}/versions/${selectedVersion.value.id}`, {
      method: 'PATCH',
      body: { [key]: editValue.value }
    })
    selectedVersion.value[key] = editValue.value
    cancelEdit()
  } finally {
    saving.value = false
  }
}

async function updateStatus(status: string) {
  await $fetch(`/api/prds/${prdId.value}/status`, { method: 'PATCH', body: { status } })
  prd.value.status = status
}

async function createNewVersion() {
  if (!newVersionForm.value.changelog.trim()) return
  creatingVersion.value = true
  try {
    const v = await $fetch<any>(`/api/prds/${prdId.value}/versions`, { method: 'POST', body: newVersionForm.value })
    showNewVersionModal.value = false
    newVersionForm.value = { changelog: '' }
    await loadPrd()
    selectedVersionId.value = v.id
  } finally {
    creatingVersion.value = false
  }
}

async function addMilestone() {
  if (!milestoneForm.value.name.trim()) return
  addingMilestone.value = true
  try {
    await $fetch(`/api/prds/${prdId.value}/milestones`, { method: 'POST', body: milestoneForm.value })
    showMilestoneModal.value = false
    milestoneForm.value = { name: '', due_date: '' }
    await loadPrd()
  } finally {
    addingMilestone.value = false
  }
}

function openGenerateTask(m: any) {
  genTaskMilestone.value = m
  genTaskForm.value = { title: '', description: '', due_date: m.due_date || '', assigned_to: '' }
  showGenTaskModal.value = true
}

async function generateTask() {
  if (!genTaskForm.value.title.trim() || !genTaskMilestone.value) return
  generatingTask.value = true
  try {
    await $fetch(`/api/milestones/${genTaskMilestone.value.id}/generate-task`, {
      method: 'POST',
      body: genTaskForm.value
    })
    showGenTaskModal.value = false
    genTaskForm.value = { title: '', description: '', due_date: '', assigned_to: '' }
    await loadPrd()
  } finally {
    generatingTask.value = false
  }
}

async function loadPrd() {
  const data = await $fetch<any>(`/api/prds/${prdId.value}`)
  prd.value = data
  if (!selectedVersionId.value && data.current_version_id) {
    selectedVersionId.value = data.current_version_id
  }
}

async function loadStaffUsers() {
  const res = await $fetch<any>('/api/users', { query: { role: 'staff', limit: 200 } })
  staffUsers.value = res.data || res
}

// Participants
const prdParticipants = ref<any[]>([])
const showInviteModal = ref(false)
const inviteSearch = ref('')
const inviteResults = ref<any[]>([])
let inviteDebounce: ReturnType<typeof setTimeout> | null = null

async function loadParticipants() {
  const res = await $fetch<any>(`/api/prds/${prdId.value}/participants`)
  prdParticipants.value = res.data || []
}

function isAlreadyParticipant(userId: number) {
  return prdParticipants.value.some(p => p.user_id === userId)
}

async function addParticipant(u: any) {
  if (isAlreadyParticipant(u.id)) return
  await $fetch(`/api/prds/${prdId.value}/participants`, { method: 'POST', body: { user_id: u.id } })
  await loadParticipants()
}

async function removeParticipant(userId: number) {
  await $fetch(`/api/prds/${prdId.value}/participants`, { method: 'DELETE', body: { user_id: userId } })
  prdParticipants.value = prdParticipants.value.filter(p => p.user_id !== userId)
}

function searchUsers() {
  if (inviteDebounce) clearTimeout(inviteDebounce)
  if (inviteSearch.value.length < 2) { inviteResults.value = []; return }
  inviteDebounce = setTimeout(async () => {
    const res = await $fetch<any>('/api/users', { query: { search: inviteSearch.value, limit: 20 } })
    inviteResults.value = res.data || []
  }, 300)
}

onMounted(async () => {
  try {
    await loadPrd()
    await Promise.all([loadStaffUsers(), loadParticipants()])
  } finally {
    loading.value = false
  }
})
</script>

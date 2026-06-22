<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ viewMode === 'kanban' ? 'Kanban board — drag cards to change status' : 'List view — all tasks' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Filters -->
        <AppSelect
          v-model="filterProject"
          :options="[{ value: '', label: 'All Projects' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
          placeholder="All Projects"
          class="w-40"
        />
        <AppSelect
          v-if="viewMode === 'list'"
          v-model="filterStatus"
          :options="[{ value: '', label: 'All Status' }, ...COLUMNS.map(c => ({ value: c.status, label: c.label }))]"
          placeholder="All Status"
          class="w-36"
        />
        <AppSelect
          v-if="viewMode === 'list'"
          v-model="filterAssignee"
          :options="[{ value: '', label: 'All Assignees' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
          placeholder="All Assignees"
          class="w-40"
        />

        <!-- View toggle -->
        <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            @click="setViewMode('list')"
            :class="['p-2 transition-colors', viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50']"
            title="List view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
          <button
            @click="setViewMode('kanban')"
            :class="['p-2 transition-colors', viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50']"
            title="Kanban view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
          </button>
        </div>

        <button @click="showCreateModal = true" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Task
        </button>
      </div>
    </div>

    <!-- Pending sync indicator -->
    <div v-if="pendingCount > 0" class="mb-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      {{ pendingCount }} action{{ pendingCount !== 1 ? 's' : '' }} pending sync
    </div>

    <!-- LIST MODE -->
    <div v-if="viewMode === 'list'">
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Title</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Project</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Assignee</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Due</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="!filteredListTasks.length">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">No tasks found</td>
            </tr>
            <tr
              v-for="task in filteredListTasks"
              :key="task.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              :class="{ 'opacity-60': task._tempId }"
              @click="openTask(task)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span v-if="task._tempId" class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <span class="font-medium text-gray-800">{{ task.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ task.project_name }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium" :style="{ background: statusColor(task.status) + '20', color: statusColor(task.status) }">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColor(task.status) }"></span>
                  {{ statusLabel(task.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="task.assigned_to_name" class="flex items-center gap-1.5">
                  <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold overflow-hidden">
                    <img v-if="task.assigned_to_avatar" :src="`/uploads/${task.assigned_to_avatar}`" class="w-full h-full object-cover" />
                    <span v-else>{{ initials(task.assigned_to_name) }}</span>
                  </span>
                  {{ task.assigned_to_name }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="task.due_date" :class="isOverdue(task.due_date) ? 'text-red-500 font-medium' : ''">
                  {{ formatDate(task.due_date) }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="task.ticket_count > 0" class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🎫 {{ task.ticket_count }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="taskPagination.page" :total-pages="taskPagination.totalPages" :total="taskPagination.total" :limit="taskPagination.limit" @page-change="onTaskPageChange" @limit-change="onTaskLimitChange" />
    </div>

    <!-- KANBAN MODE — grouped by project -->
    <div v-else class="space-y-8">
      <div v-for="proj in kanbanProjects" :key="proj.id">
        <!-- Project header -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <h2 class="font-semibold text-gray-800">{{ proj.name }}</h2>
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ proj.tasks.length }} tasks</span>
        </div>

        <!-- Kanban columns for this project -->
        <div class="flex gap-4 overflow-x-auto pb-2">
          <div v-for="col in COLUMNS" :key="col.status" class="flex-shrink-0 w-64">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: col.color }"></span>
              <h3 class="font-medium text-gray-600 text-xs uppercase tracking-wide">{{ col.label }}</h3>
              <span class="bg-gray-100 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">{{ tasksByProjectAndStatus[proj.id]?.[col.status]?.length || 0 }}</span>
            </div>

            <ClientOnly>
              <draggable
                :list="tasksByProjectAndStatus[proj.id]?.[col.status] || []"
                group="tasks"
                item-key="id"
                class="min-h-16 space-y-2"
                @end="onDragEnd($event, col.status)"
              >
                <template #item="{ element }">
                  <div
                    class="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    :class="{ 'opacity-60': element._tempId }"
                    @click="openTask(element)"
                  >
                    <div v-if="element._tempId" class="text-xs text-amber-500 mb-1 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                      Pending sync
                    </div>
                    <p class="text-sm font-medium text-gray-800 leading-snug">{{ element.title }}</p>
                    <div class="flex items-center justify-between mt-2">
                      <div class="flex items-center gap-1.5">
                        <span v-if="element.ticket_count > 0" class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🎫 {{ element.ticket_count }}</span>
                        <span v-if="element.due_date" :class="['text-xs', isOverdue(element.due_date) ? 'text-red-500' : 'text-gray-400']">{{ formatDate(element.due_date) }}</span>
                      </div>
                      <span v-if="element.assigned_to_name" class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden">
                        <img v-if="element.assigned_to_avatar" :src="`/uploads/${element.assigned_to_avatar}`" class="w-full h-full object-cover" />
                        <span v-else>{{ initials(element.assigned_to_name) }}</span>
                      </span>
                    </div>
                  </div>
                </template>
              </draggable>
            </ClientOnly>

            <button
              @click="quickCreate(col.status, proj.id)"
              class="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-2 rounded-lg border border-dashed border-gray-200 flex items-center justify-center gap-1"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add
            </button>
          </div>
        </div>
      </div>

      <div v-if="!kanbanProjects.length" class="text-center text-gray-400 py-12">No tasks found</div>
    </div>

    <!-- Create task modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="() => { taskPasteImages.forEach(i => URL.revokeObjectURL(i.blobUrl)); taskPasteImages.length = 0; showCreateModal = false }">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-lg font-semibold mb-4">New Task</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <AppSelect
              v-model="form.project_id"
              :options="[{ value: '', label: 'Select project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
              placeholder="Select project"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input v-model="form.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Task title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional description (Ctrl+V untuk paste gambar)" @paste="handleTaskPaste"></textarea>
            <!-- Paste image preview -->
            <div v-if="taskPasteImages.length" class="flex flex-wrap gap-2 mt-2">
              <div v-for="(img, i) in taskPasteImages" :key="i" class="relative group">
                <img :src="img.blobUrl" class="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" @click="openTaskPasteLightbox(i)" />
                <button type="button" @click="removeTaskPasteImage(i)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">×</button>
              </div>
              <p v-if="taskPasteUploading" class="text-[11px] text-indigo-500 self-center">Mengupload...</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <AppSelect
                v-model="form.status"
                :options="COLUMNS.map(c => ({ value: c.status, label: c.label }))"
                placeholder="Status"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
              <AppSelect
                v-model="form.assigned_to"
                :options="[{ value: '', label: 'Unassigned' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
                placeholder="Unassigned"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input v-model="form.due_date" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div v-if="systemMenus.length">
            <label class="block text-sm font-medium text-gray-700 mb-1">Modul / Menu Sistem</label>
            <AppSelect
              v-model="form.system_menu_id"
              :options="systemMenuOptions"
              placeholder="— Tidak dipilih —"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lampiran</label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span class="text-xs text-slate-500">{{ taskUploading ? 'Mengupload...' : 'Pilih file (maks. 10MB)' }}</span>
              <input type="file" multiple class="hidden" :disabled="taskUploading" @change="handleTaskFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
            </label>
            <div v-if="taskUploadedFiles.length" class="mt-2 flex flex-wrap gap-2">
              <div v-for="(f, i) in taskUploadedFiles" :key="i">
                <template v-if="f.mime_type?.startsWith('image/')">
                  <div class="flex flex-col items-center gap-0.5">
                    <img :src="`/uploads/${f.filename}`" :alt="f.original_name" class="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                    <button type="button" @click="taskUploadedFiles.splice(i, 1)" class="text-[10px] text-slate-400 hover:text-red-500">✕</button>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <span class="max-w-[120px] truncate">{{ f.original_name }}</span>
                    <button type="button" @click="taskUploadedFiles.splice(i, 1)" class="text-slate-400 hover:text-red-500">✕</button>
                  </div>
                </template>
              </div>
            </div>
            <p v-if="taskUploadError" class="text-xs text-red-600 mt-1">{{ taskUploadError }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="() => { taskPasteImages.forEach(i => URL.revokeObjectURL(i.blobUrl)); taskPasteImages.length = 0; showCreateModal = false }" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button @click="createTask" :disabled="creating" class="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ creating ? 'Creating…' : 'Create Task' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Task detail slide-over -->
    <TaskDetailPanel
      v-if="selectedTask"
      :task="selectedTask"
      @close="selectedTask = null"
      @deleted="onTaskDeleted"
    />

  </div>
</template>

<script setup lang="ts">
const draggable = defineAsyncComponent(() => import('vuedraggable'))

definePageMeta({ middleware: 'auth' })

const COLUMNS = [
  { status: 'backlog',     label: 'Backlog',      color: '#94a3b8' },
  { status: 'todo',        label: 'To Do',         color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress',   color: '#3b82f6' },
  { status: 'review',      label: 'Review',        color: '#f59e0b' },
  { status: 'done',        label: 'Done',           color: '#22c55e' },
]

const { pendingCount } = useSync()

// View mode — persisted to localStorage
const viewMode = ref<'list' | 'kanban'>('kanban')

onMounted(() => {
  const saved = localStorage.getItem('task_view_mode')
  if (saved === 'list' || saved === 'kanban') viewMode.value = saved
})

function setViewMode(mode: 'list' | 'kanban') {
  viewMode.value = mode
  localStorage.setItem('task_view_mode', mode)
  taskPagination.page = 1
  loadTasks()
}

// Filters
const filterProject = ref('')
const filterStatus = ref('')
const filterAssignee = ref('')

const tasks = ref<any[]>([])
const projects = ref<any[]>([])
const staffUsers = ref<any[]>([])
const showCreateModal = ref(false)
const creating = ref(false)
const selectedTask = ref<any>(null)

const systemMenus = ref<any[]>([])
const systemMenuOptions = computed(() => {
  const opts: any[] = [{ value: '', label: '— Tidak dipilih —' }]
  const byModule: Record<string, any[]> = {}
  for (const item of systemMenus.value) {
    if (!byModule[item.module]) byModule[item.module] = []
    byModule[item.module].push(item)
  }
  for (const [mod, items] of Object.entries(byModule)) {
    opts.push({ group: mod })
    for (const item of items) {
      const label = item.type
        ? `${mod} › ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} › ${item.name}`
        : mod
      opts.push({ value: item.id, label })
    }
  }
  return opts
})

const form = reactive({
  project_id: '',
  title: '',
  description: '',
  status: 'backlog',
  assigned_to: '',
  due_date: '',
  system_menu_id: '',
})

const taskPasteImages = ref<Array<{ blobUrl: string; name: string; file: File }>>([])
const taskPasteUploading = ref(false)
const taskUploadedFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])
const taskUploading = ref(false)
const taskUploadError = ref('')

async function handleTaskFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  taskUploading.value = true
  taskUploadError.value = ''
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('menu', 'task')
      if (form.project_id) {
        const proj = projects.value?.find((p: any) => String(p.id) === String(form.project_id))
        fd.append('project_id', String(form.project_id))
        fd.append('project_name', proj?.name || '')
      }
      const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      taskUploadedFiles.value.push(res.data)
    }
  } catch (err: any) {
    taskUploadError.value = err?.data?.statusMessage || 'Gagal mengupload file'
  } finally {
    taskUploading.value = false
    input.value = ''
  }
}

function handleTaskPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
  if (!items.length) return
  e.preventDefault()
  for (const item of items) {
    const file = item.getAsFile()
    if (file) {
      const ext = item.type.split('/')[1] || 'png'
      const name = `paste-${Date.now()}.${ext}`
      taskPasteImages.value.push({ blobUrl: URL.createObjectURL(file), name, file })
    }
  }
}

function openTaskPasteLightbox(idx: number) {
  lb.open(taskPasteImages.value.map(i => ({ url: i.blobUrl, name: i.name })), idx)
}

function removeTaskPasteImage(idx: number) {
  URL.revokeObjectURL(taskPasteImages.value[idx].blobUrl)
  taskPasteImages.value.splice(idx, 1)
}

// List mode: flat filtered tasks
const filteredListTasks = computed(() => {
  return tasks.value.filter(t => {
    if (filterProject.value && String(t.project_id) !== String(filterProject.value)) return false
    if (filterStatus.value && t.status !== filterStatus.value) return false
    if (filterAssignee.value && String(t.assigned_to) !== String(filterAssignee.value)) return false
    return true
  })
})

// Kanban mode: group by project, then by status
const kanbanProjects = computed(() => {
  const filtered = filterProject.value
    ? tasks.value.filter(t => String(t.project_id) === String(filterProject.value))
    : tasks.value

  const projMap = new Map<number, { id: number; name: string; tasks: any[] }>()
  for (const t of filtered) {
    if (!projMap.has(t.project_id)) {
      projMap.set(t.project_id, { id: t.project_id, name: t.project_name, tasks: [] })
    }
    projMap.get(t.project_id)!.tasks.push(t)
  }
  return [...projMap.values()]
})

const tasksByProjectAndStatus = computed(() => {
  const result: Record<number, Record<string, any[]>> = {}
  for (const proj of kanbanProjects.value) {
    result[proj.id] = {}
    for (const col of COLUMNS) result[proj.id][col.status] = []
    for (const t of proj.tasks) {
      const bucket = result[proj.id][t.status] ?? result[proj.id]['backlog']
      bucket.push(t)
    }
  }
  return result
})

const taskPagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 10 })

async function loadTasks() {
  if (viewMode.value === 'kanban') {
    // Kanban loads all tasks (no pagination)
    const q: Record<string, any> = { paginate: 'false' }
    if (filterProject.value) q.project_id = filterProject.value
    const res = await $fetch<any[]>('/api/tasks', { query: q })
    tasks.value = Array.isArray(res) ? res : (res as any)?.data || []
  } else {
    // List mode — paginated
    const q: Record<string, any> = { page: taskPagination.page, limit: taskPagination.limit }
    if (filterProject.value) q.project_id = filterProject.value
    if (filterStatus.value) q.status = filterStatus.value
    if (filterAssignee.value) q.assigned_to = filterAssignee.value
    const res = await $fetch<any>('/api/tasks', { query: q })
    tasks.value = res?.data || []
    taskPagination.total = res?.total ?? 0
    taskPagination.totalPages = res?.totalPages ?? 1
    taskPagination.page = res?.page ?? 1
  }
}

function onTaskPageChange(p: number) { taskPagination.page = p; loadTasks() }
function onTaskLimitChange(l: number) { taskPagination.limit = l; taskPagination.page = 1; loadTasks() }

async function loadProjects() {
  projects.value = (await $fetch<any>('/api/projects'))?.data || []
}

async function loadUsers() {
  const res = await $fetch<any>('/api/users', { query: { limit: 200 } })
  const all = res?.data ?? []
  staffUsers.value = all.filter((u: any) => u.is_active && (u.role === 'staff' || u.role === 'admin'))
}

async function loadSystemMenus(projectId?: string | number) {
  const url = projectId ? `/api/system-menus?project_id=${projectId}` : '/api/system-menus'
  const res = await $fetch<any>(url).catch(() => null)
  systemMenus.value = res?.data || []
}

watch([filterProject, filterStatus, filterAssignee], () => { taskPagination.page = 1; loadTasks() })

watch(() => form.project_id, (val) => {
  form.system_menu_id = ''
  loadSystemMenus(val || undefined)
})

onMounted(async () => {
  await Promise.all([loadTasks(), loadProjects(), loadUsers(), loadSystemMenus()])
})

// Helpers
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function statusColor(status: string) {
  return COLUMNS.find(c => c.status === status)?.color ?? '#94a3b8'
}

function statusLabel(status: string) {
  return COLUMNS.find(c => c.status === status)?.label ?? status
}

const { fmtShort: formatDate, isOverdue } = useDate()

async function openTask(task: any) {
  selectedTask.value = await $fetch<any>(`/api/tasks/${task.id}`)
}

function quickCreate(status: string, projectId?: number) {
  form.status = status
  if (projectId) form.project_id = String(projectId)
  showCreateModal.value = true
}

async function createTask() {
  if (!form.project_id || !form.title.trim()) return
  creating.value = true
  try {
    let description = form.description || ''
    if (taskPasteImages.value.length) {
      taskPasteUploading.value = true
      for (const img of taskPasteImages.value) {
        const fd = new FormData()
        fd.append('file', img.file, img.name)
        fd.append('menu', 'task')
        if (form.project_id) {
          const proj = projects.value?.find((p: any) => String(p.id) === String(form.project_id))
          fd.append('project_id', String(form.project_id))
          fd.append('project_name', proj?.name || '')
        }
        const r = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
        description += `\n\n![${img.name}](/uploads/${r.data.filename})`
      }
      taskPasteImages.value.forEach(i => URL.revokeObjectURL(i.blobUrl))
      taskPasteImages.value = []
      taskPasteUploading.value = false
    }
    await performAction('task', 'create', `tmp_${Date.now()}`, {
      project_id: Number(form.project_id),
      title: form.title.trim(),
      description: description || undefined,
      status: form.status,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      due_date: form.due_date || undefined,
      system_menu_id: form.system_menu_id ? Number(form.system_menu_id) : undefined,
      attachments: taskUploadedFiles.value.length ? taskUploadedFiles.value : undefined,
    })
    await loadTasks()
    showCreateModal.value = false
    taskUploadedFiles.value = []
    taskUploadError.value = ''
    Object.assign(form, { project_id: '', title: '', description: '', status: 'backlog', assigned_to: '', due_date: '', system_menu_id: '' })
  } finally {
    creating.value = false
    taskPasteUploading.value = false
  }
}

async function onDragEnd(evt: any, toStatus: string) {
  const allColTasks = Object.values(tasksByProjectAndStatus.value)
    .flatMap(proj => proj[toStatus] ?? [])
  for (let i = 0; i < allColTasks.length; i++) {
    const t = allColTasks[i]
    if (t.status !== toStatus || t.position !== i) {
      t.status = toStatus
      t.position = i
      await performAction('task', 'update', t.id, { status: toStatus, position: i })
    }
  }
}

async function onTaskDeleted() {
  selectedTask.value = null
  await loadTasks()
}
</script>

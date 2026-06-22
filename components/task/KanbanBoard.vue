<template>
  <div class="space-y-8">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
      <svg class="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      Loading…
    </div>

    <!-- Empty -->
    <div v-else-if="!groupedProjects.length" class="text-center text-gray-400 py-16">
      No tasks found
    </div>

    <!-- Per-project sections -->
    <div v-for="proj in groupedProjects" :key="proj.project_id">
      <!-- Project header -->
      <button
        class="flex items-center gap-2 mb-4 group w-full text-left"
        @click="toggleCollapse(proj.project_id)"
      >
        <svg
          class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
          :class="{ '-rotate-90': collapseState[proj.project_id] }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        <div class="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        </div>
        <span class="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{{ proj.project_name }}</span>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ proj.tasks.length }}</span>
      </button>

      <!-- Kanban columns -->
      <div v-show="!collapseState[proj.project_id]" class="flex gap-4 overflow-x-auto pb-3">
        <div v-for="col in COLUMNS" :key="col.status" class="flex-shrink-0 w-64">
          <!-- Column header -->
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: col.color }"></span>
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ col.label }}</span>
            <span class="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {{ byStatus(proj)[col.status].length }}
            </span>
          </div>

          <!-- Draggable card list -->
          <ClientOnly>
            <draggable
              :list="byStatus(proj)[col.status]"
              :group="`proj-${proj.project_id}`"
              item-key="id"
              class="min-h-12 space-y-2"
              ghost-class="opacity-40"
              chosen-class="ring-2 ring-indigo-400"
              @change="(evt) => onColChange(evt, proj, col.status)"
            >
              <template #item="{ element }">
                <div
                  class="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-200 transition-all select-none"
                  @click="openTask(element)"
                >
                  <p class="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{{ element.title }}</p>

                  <div class="flex items-center justify-between mt-2.5 gap-2">
                    <!-- Left: ticket badge + due date -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        v-if="element.ticket_count > 0"
                        class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium"
                      >🎫 {{ element.ticket_count }}</span>
                      <span
                        v-if="element.due_date"
                        :class="['text-xs', isOverdue(element.due_date) ? 'text-red-500 font-medium' : 'text-gray-400']"
                      >{{ fmtDate(element.due_date) }}</span>
                    </div>
                    <!-- Right: assignee avatar -->
                    <span
                      v-if="element.assigned_to_name"
                      class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold flex-shrink-0 overflow-hidden"
                      :title="element.assigned_to_name"
                    >
                      <img v-if="element.assigned_to_avatar" :src="`/uploads/${element.assigned_to_avatar}`" class="w-full h-full object-cover" />
                      <span v-else>{{ initials(element.assigned_to_name) }}</span>
                    </span>
                  </div>
                </div>
              </template>
            </draggable>

            <!-- Fallback slot shown during SSR / before hydration -->
            <template #fallback>
              <div class="min-h-12 space-y-2">
                <div
                  v-for="t in byStatus(proj)[col.status]"
                  :key="t.id"
                  class="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer"
                  @click="openTask(t)"
                >
                  <p class="text-sm font-medium text-gray-800 leading-snug">{{ t.title }}</p>
                </div>
              </div>
            </template>
          </ClientOnly>

          <!-- Quick-add button -->
          <button
            class="mt-2 w-full text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg border border-dashed border-gray-200 flex items-center justify-center gap-1 transition-colors"
            @click="$emit('quickAdd', { status: col.status, project_id: proj.project_id, project_name: proj.project_name })"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Task detail slide-over -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="selectedTask" class="fixed inset-0 bg-black/20 z-40" @click.self="selectedTask = null">
        <Transition
          enter-active-class="transition-transform duration-200"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-150"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div v-if="selectedTask" class="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            <!-- Header -->
            <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
              <div class="min-w-0">
                <span class="text-xs text-gray-400">{{ selectedTask.project_name }}</span>
                <h2 class="text-lg font-semibold text-gray-900 mt-0.5">{{ selectedTask.title }}</h2>
              </div>
              <button @click="selectedTask = null" class="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-5 flex-1">
              <!-- Meta pills -->
              <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border"
                  :style="{ borderColor: statusColor(selectedTask.status) + '60', background: statusColor(selectedTask.status) + '15', color: statusColor(selectedTask.status) }">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColor(selectedTask.status) }"></span>
                  {{ statusLabel(selectedTask.status) }}
                </span>
                <span v-if="selectedTask.assigned_to_name" class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold overflow-hidden">
                    <img v-if="selectedTask.assigned_to_avatar" :src="`/uploads/${selectedTask.assigned_to_avatar}`" class="w-full h-full object-cover" />
                    <span v-else>{{ initials(selectedTask.assigned_to_name) }}</span>
                  </span>
                  {{ selectedTask.assigned_to_name }}
                </span>
                <span v-if="selectedTask.due_date" class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  :class="isOverdue(selectedTask.due_date) ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {{ fmtDate(selectedTask.due_date) }}
                </span>
              </div>

              <!-- Description -->
              <p v-if="selectedTask.description" class="text-sm text-gray-600 leading-relaxed">{{ selectedTask.description }}</p>
              <p v-else class="text-sm text-gray-300 italic">No description</p>

              <!-- Linked tickets -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-700">Linked Tickets <span class="text-gray-400 font-normal">({{ selectedTask.tickets?.length || 0 }})</span></h3>
                  <button
                    class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    @click="createTicketFromTask(selectedTask)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Create Ticket
                  </button>
                </div>
                <div v-if="selectedTask.tickets?.length" class="space-y-2">
                  <NuxtLink
                    v-for="tk in selectedTask.tickets" :key="tk.id"
                    :to="`/tickets/${tk.id}`"
                    class="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 text-sm transition-colors"
                    @click="selectedTask = null"
                  >
                    <span class="text-indigo-600 font-mono text-xs flex-shrink-0">{{ tk.ticket_number }}</span>
                    <span class="text-gray-700 truncate flex-1">{{ tk.title }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0" :style="{ background: tk.status_color }">{{ tk.status_name }}</span>
                  </NuxtLink>
                </div>
                <p v-else class="text-xs text-gray-400">No tickets linked yet.</p>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="p-6 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button
                class="text-xs text-red-500 hover:text-red-700 transition-colors"
                @click="deleteTask(selectedTask.id)"
              >Delete task</button>
              <button
                class="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                @click="selectedTask = null"
              >Close</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const draggable = defineAsyncComponent(() => import('vuedraggable'))

const emit = defineEmits<{
  quickAdd: [payload: { status: string; project_id: number; project_name: string }]
  taskDeleted: [id: number]
}>()

const props = defineProps<{
  filterProject?: string | number
}>()

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS = [
  { status: 'backlog',     label: 'Backlog',      color: '#94a3b8' },
  { status: 'todo',        label: 'To Do',         color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress',   color: '#3b82f6' },
  { status: 'review',      label: 'Review',        color: '#f59e0b' },
  { status: 'done',        label: 'Done',           color: '#22c55e' },
]

// ─── State ───────────────────────────────────────────────────────────────────

const loading = ref(true)
const rawGroups = ref<{ project_id: number; project_name: string; tasks: any[] }[]>([])
const selectedTask = ref<any>(null)
const collapseState = ref<Record<number, boolean>>({})

// ─── Computed ─────────────────────────────────────────────────────────────────

const groupedProjects = computed(() => {
  if (!props.filterProject) return rawGroups.value
  return rawGroups.value.filter(p => String(p.project_id) === String(props.filterProject))
})

// Returns tasks bucketed by status for a given project group
function byStatus(proj: { tasks: any[] }): Record<string, any[]> {
  const map: Record<string, any[]> = {}
  for (const col of COLUMNS) map[col.status] = []
  for (const t of proj.tasks) {
    const bucket = map[t.status] ?? map['backlog']
    bucket.push(t)
  }
  return map
}

// ─── Collapse ─────────────────────────────────────────────────────────────────

const COLLAPSE_KEY = 'kanban_collapse'

function loadCollapseState() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (raw) collapseState.value = JSON.parse(raw)
  } catch {}
}

function saveCollapseState() {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState.value))
}

function toggleCollapse(projectId: number) {
  collapseState.value[projectId] = !collapseState.value[projectId]
  saveCollapseState()
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  try {
    const url = props.filterProject
      ? `/api/tasks?group_by=project&project_id=${props.filterProject}`
      : '/api/tasks?group_by=project'
    rawGroups.value = await $fetch<any[]>(url)
  } finally {
    loading.value = false
  }
}

watch(() => props.filterProject, load)

onMounted(() => {
  loadCollapseState()
  load()
})

// ─── Drag & drop ─────────────────────────────────────────────────────────────

async function onDragEnd(
  evt: { newIndex: number; oldIndex: number },
  proj: { project_id: number; tasks: any[] },
  toStatus: string
) {
  // vuedraggable already mutated byStatus(proj)[toStatus] in place via :list binding.
  // Re-derive the column list from proj.tasks to get the updated order.
  const colTasks = byStatus(proj)[toStatus]
  for (let i = 0; i < colTasks.length; i++) {
    const t = colTasks[i]
    if (t.status !== toStatus || t.position !== i) {
      t.status = toStatus
      t.position = i
      // Fire-and-forget — optimistic update already applied
      $fetch(`/api/tasks/${t.id}`, {
        method: 'PUT',
        body: { status: toStatus, position: i },
      }).catch(() => {})
    }
  }
}

// ─── Task detail ─────────────────────────────────────────────────────────────

async function openTask(task: any) {
  const detail = await $fetch<any>(`/api/tasks/${task.id}`)
  selectedTask.value = detail
}

const { confirmDelete } = useConfirm()
async function deleteTask(id: number) {
  if (!await confirmDelete('Task ini akan dihapus permanen.', 'Hapus task?')) return
  await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  selectedTask.value = null
  emit('taskDeleted', id)
  await load()
}

function createTicketFromTask(task: any) {
  navigateTo(`/tickets/new?task_id=${task.id}&project_id=${task.project_id}&title=${encodeURIComponent(task.title)}`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

function statusColor(status: string) {
  return COLUMNS.find(c => c.status === status)?.color ?? '#94a3b8'
}

function statusLabel(status: string) {
  return COLUMNS.find(c => c.status === status)?.label ?? status
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string) {
  return new Date(d) < new Date()
}

// ─── Expose for parent ────────────────────────────────────────────────────────
defineExpose({ load })
</script>

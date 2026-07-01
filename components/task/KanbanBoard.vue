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
              {{ buckets[proj.project_id]?.[col.status]?.length ?? 0 }}
            </span>
          </div>

          <!-- Draggable card list -->
          <ClientOnly>
            <draggable
              :list="buckets[proj.project_id]?.[col.status] ?? []"
              :group="col.readonly ? { name: `proj-${proj.project_id}`, pull: true, put: false } : `proj-${proj.project_id}`"
              item-key="id"
              :disabled="col.readonly"
              class="min-h-12 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-0.5"
              ghost-class="opacity-40"
              chosen-class="ring-2 ring-indigo-400"
              @change="(evt) => onColChange(evt, proj, col.status)"
            >
              <template #item="{ element }">
                <div
                  :class="[
                    'rounded-xl border p-3 cursor-pointer transition-all select-none',
                    col.status === 'done'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300 opacity-75 shadow-none'
                      : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200'
                  ]"
                  @click="openTask(element)"
                >
                  <p :class="['text-sm font-medium leading-snug line-clamp-2', col.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800']">{{ element.title }}</p>

                  <!-- PRD badge -->
                  <div v-if="element.prd_id" class="mt-1.5">
                    <NuxtLink
                      :to="`/prds/${element.prd_id}`"
                      @click.stop
                      class="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium hover:bg-purple-100 transition-colors"
                    >
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      PRD-{{ element.prd_id }}<span v-if="element.prd_version_number"> v{{ element.prd_version_number }}</span>
                    </NuxtLink>
                  </div>

                  <div class="flex items-center justify-between mt-2.5 gap-2">
                    <!-- Left: ticket badge + due date -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        v-if="element.ticket_count > 0"
                        class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium"
                      >🎫 {{ element.ticket_count }}</span>
                      <span
                        v-if="element.due_date"
                        :class="['text-xs', isOverdue(element.due_date) && col.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-400']"
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
                  v-for="t in buckets[proj.project_id]?.[col.status] ?? []"
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

    <!-- Task detail panel — full featured, same as tasks page -->
    <TaskDetailPanel
      v-if="selectedTask"
      :task="selectedTask"
      @close="selectedTask = null"
      @deleted="(id) => { selectedTask = null; emit('taskDeleted', id); load() }"
    />
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
  { status: 'backlog',     label: 'Backlog',      color: '#94a3b8', readonly: false },
  { status: 'todo',        label: 'To Do',         color: '#6366f1', readonly: false },
  { status: 'in_progress', label: 'In Progress',   color: '#3b82f6', readonly: false },
  { status: 'review',      label: 'Review',        color: '#f59e0b', readonly: false },
  { status: 'in_qc',       label: 'In QC',         color: '#a855f7', readonly: true },
  { status: 'done',        label: 'Done',           color: '#22c55e', readonly: false },
]

// ─── State ───────────────────────────────────────────────────────────────────

const loading = ref(true)
const rawGroups = ref<{ project_id: number; project_name: string; tasks: any[] }[]>([])
// Stable reactive bucket arrays per project — vuedraggable mutates these in-place
const buckets = ref<Record<number, Record<string, any[]>>>({})
const selectedTask = ref<any>(null)
const collapseState = ref<Record<number, boolean>>({})

// ─── Computed ─────────────────────────────────────────────────────────────────

const groupedProjects = computed(() => {
  if (!props.filterProject) return rawGroups.value
  return rawGroups.value.filter(p => String(p.project_id) === String(props.filterProject))
})

function buildBuckets(groups: { project_id: number; tasks: any[] }[]) {
  const result: Record<number, Record<string, any[]>> = {}
  for (const proj of groups) {
    const map: Record<string, any[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const t of proj.tasks) {
      const bucket = map[t.status] ?? map['backlog']
      bucket.push(t)
    }
    result[proj.project_id] = map
  }
  buckets.value = result
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
    const res = await $fetch<any>(url)
    // API returns array directly for group_by=project
    const groups: any[] = Array.isArray(res) ? res : (res as any)?.data ?? []
    rawGroups.value = groups
    buildBuckets(groups)
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

function onColChange(
  evt: { added?: { element: any; newIndex: number }; removed?: any; moved?: any },
  proj: { project_id: number; tasks: any[] },
  toStatus: string
) {
  if (!evt.added) return
  const task = evt.added.element
  // Update status on the task object (already in bucket via vuedraggable mutation)
  task.status = toStatus
  // Sync back to rawGroups so project task count stays consistent
  const rawProj = rawGroups.value.find((p: any) => p.project_id === proj.project_id)
  if (rawProj) {
    const t = rawProj.tasks.find((t: any) => t.id === task.id)
    if (t) t.status = toStatus
  }
  $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { status: toStatus } })
    .catch(() => load())
}

// ─── Task detail ─────────────────────────────────────────────────────────────

async function updateSelectedStatus(status: string) {
  if (!selectedTask.value) return
  const taskId = selectedTask.value.id
  const oldStatus = selectedTask.value.status
  selectedTask.value.status = status
  await $fetch(`/api/tasks/${taskId}`, { method: 'PUT', body: { status } }).catch(() => {})
  // Move task between buckets
  for (const proj of rawGroups.value) {
    const idx = proj.tasks.findIndex((t: any) => t.id === taskId)
    if (idx !== -1) {
      proj.tasks[idx].status = status
      // Move in buckets
      const pid = proj.project_id
      if (buckets.value[pid]) {
        const srcBucket = buckets.value[pid][oldStatus]
        const taskInBucket = srcBucket?.find((t: any) => t.id === taskId)
        if (taskInBucket && srcBucket) {
          srcBucket.splice(srcBucket.indexOf(taskInBucket), 1)
          buckets.value[pid][status]?.push(taskInBucket)
          taskInBucket.status = status
        }
      }
      break
    }
  }
}

async function openTask(task: any) {
  const detail = await $fetch<any>(`/api/tasks/${task.id}`)
  selectedTask.value = detail
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

const { fmtShort: fmtDate, isOverdue } = useDate()

// ─── Expose for parent ────────────────────────────────────────────────────────
defineExpose({ load })
</script>

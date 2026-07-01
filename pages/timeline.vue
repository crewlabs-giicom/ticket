<template>
  <div class="p-6 max-w-full mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Master Timeline</h1>
        <p class="text-sm text-slate-400 mt-0.5">Konsolidasi timeline lintas project</p>
      </div>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="loading" @click="load" />
        <div class="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          <button v-for="s in ['week','month'] as const" :key="s" @click="tlScale = s"
            :class="['text-xs px-3 py-1.5 transition-colors', tlScale === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50']">
            {{ s === 'week' ? 'Minggu' : 'Bulan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-5 p-3 bg-white border border-slate-200 rounded-xl">
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 font-medium">Project</span>
        <AppSelect v-model="filterProjectId"
          :options="[{ value: '', label: 'Semua Project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]"
          placeholder="Semua Project" class="w-44" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 font-medium">Assignee</span>
        <AppSelect v-model="filterAssignee"
          :options="[{ value: '', label: 'Semua Assignee' }, ...staffUsers.map(u => ({ value: u.id, label: u.name }))]"
          placeholder="Semua" class="w-40" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 font-medium">Tampilkan</span>
        <label v-for="t in showTypes" :key="t.key" class="flex items-center gap-1 text-xs cursor-pointer">
          <input type="checkbox" v-model="t.visible" class="rounded accent-indigo-600" />
          {{ t.label }}
        </label>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 text-xs text-slate-500 mb-3">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-indigo-500 inline-block"></span>PRD</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-400 inline-block"></span>Task</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span>QC Form</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>Overdue</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-400 inline-block"></span>Selesai</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rotate-45 bg-fuchsia-500 inline-block"></span>Milestone</span>
    </div>

    <div v-if="loading" class="text-center py-16 text-slate-400">Memuat…</div>
    <div v-else-if="!filteredGroups.length" class="card p-12 text-center text-slate-400">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <p class="text-sm">Tidak ada data timeline yang cocok.</p>
      <p class="text-xs mt-1 text-slate-300">Coba ubah filter atau isi due date pada PRD / Task / QC Form.</p>
    </div>

    <!-- Gantt -->
    <div v-else class="card overflow-auto">
      <div :style="{ minWidth: (208 + tlColumns.length * tlColWidth) + 'px' }">
        <!-- Header row -->
        <div class="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div class="w-52 flex-shrink-0 px-3 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200">Item</div>
          <div class="flex-1 flex">
            <div v-for="col in tlColumns" :key="col.key"
              class="flex-shrink-0 text-center text-[10px] text-slate-400 py-2 border-r border-slate-100 font-medium"
              :style="{ width: tlColWidth + 'px' }">
              {{ col.label }}
              <div v-if="col.isToday" class="h-0.5 bg-red-400 rounded-full mt-0.5 mx-1"></div>
            </div>
          </div>
        </div>

        <!-- Rows -->
        <div class="divide-y divide-slate-100">
          <template v-for="group in filteredGroups" :key="group.projectId + '-' + (group.prdId ?? 'np')">
            <!-- Project label (when project changes) -->
            <div v-if="group.showProjectLabel" class="flex items-center bg-slate-100/70 border-b border-slate-200">
              <div class="w-52 flex-shrink-0 px-3 py-1.5 border-r border-slate-200">
                <NuxtLink :to="`/projects/${group.projectId}`" class="text-[11px] font-bold text-slate-600 hover:text-indigo-600 truncate block">
                  📁 {{ group.projectName }}
                </NuxtLink>
              </div>
              <div class="flex-1 h-6"></div>
            </div>

            <!-- PRD row -->
            <div v-if="group.prd && showTypes.find(t => t.key === 'prd')?.visible" class="flex items-center hover:bg-slate-50">
              <div class="w-52 flex-shrink-0 px-3 py-2.5 border-r border-slate-100 pl-5">
                <NuxtLink :to="`/prds/${group.prd.id}`" class="text-xs font-semibold text-indigo-700 hover:underline truncate flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                  {{ group.prd.title }}
                </NuxtLink>
                <span :class="['text-[10px] px-1.5 py-px rounded-full font-medium ml-3', prdStatusClass(group.prd.status)]">{{ group.prd.status.replace('_',' ') }}</span>
              </div>
              <div class="flex-1 relative h-10">
                <GanttBar :item="group.prd" type="prd" :columns="tlColumns" :col-width="tlColWidth" />
                <GanttMilestone v-for="m in milestonesByPrd[group.prd.id]" :key="'m'+m.id" :milestone="m" :columns="tlColumns" :col-width="tlColWidth" />
              </div>
            </div>

            <!-- Tasks -->
            <template v-if="showTypes.find(t => t.key === 'task')?.visible">
              <template v-for="task in group.tasks" :key="'t'+task.id">
                <div class="flex items-center hover:bg-slate-50">
                  <div class="w-52 flex-shrink-0 px-3 py-2 border-r border-slate-100" :class="group.prd ? 'pl-8' : 'pl-5'">
                    <p class="text-xs text-slate-700 truncate">{{ task.title }}</p>
                    <div class="flex items-center gap-1">
                      <span :class="['text-[10px] px-1 py-px rounded font-medium', taskStatusClass(task.status)]">{{ task.status.replace('_',' ') }}</span>
                      <span v-if="task.assigned_to_name" class="text-[10px] text-slate-400 truncate">· {{ task.assigned_to_name }}</span>
                    </div>
                  </div>
                  <div class="flex-1 relative h-9">
                    <GanttBar :item="task" type="task" :columns="tlColumns" :col-width="tlColWidth" />
                  </div>
                </div>

                <!-- QC Forms -->
                <template v-if="showTypes.find(t => t.key === 'qc')?.visible">
                  <div v-for="qc in qcByTask[task.id]" :key="'qc'+qc.id"
                    class="flex items-center hover:bg-amber-50/50">
                    <div class="w-52 flex-shrink-0 px-3 py-2 border-r border-slate-100" :class="group.prd ? 'pl-14' : 'pl-10'">
                      <NuxtLink :to="`/qc-forms/${qc.id}`" class="text-[11px] text-amber-700 hover:underline truncate block">
                        QC #{{ qc.sequence }}{{ qc.sequence > 1 ? ' (Loop)' : '' }}
                      </NuxtLink>
                      <span :class="['text-[10px] px-1 py-px rounded font-medium', qc.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700']">
                        {{ qc.status === 'completed' ? 'Selesai' : 'Aktif' }}
                      </span>
                    </div>
                    <div class="flex-1 relative h-8">
                      <GanttBar :item="qc" type="qc" :columns="tlColumns" :col-width="tlColWidth" />
                    </div>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- Summary per assignee -->
    <div v-if="assigneeSummary.length" class="mt-6">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Ringkasan per Assignee</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="a in assigneeSummary" :key="a.name" class="card p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {{ a.name?.charAt(0) }}
            </div>
            <span class="text-sm font-semibold text-slate-700">{{ a.name }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-slate-50 rounded-lg py-2">
              <p class="text-lg font-bold text-slate-700">{{ a.total }}</p>
              <p class="text-slate-400">Total Task</p>
            </div>
            <div class="bg-emerald-50 rounded-lg py-2">
              <p class="text-lg font-bold text-emerald-600">{{ a.done }}</p>
              <p class="text-emerald-500">Selesai</p>
            </div>
            <div class="bg-red-50 rounded-lg py-2">
              <p class="text-lg font-bold text-red-500">{{ a.overdue }}</p>
              <p class="text-red-400">Overdue</p>
            </div>
          </div>
          <div v-if="a.total > 0" class="mt-2 bg-slate-100 rounded-full h-1.5">
            <div class="bg-emerald-500 h-1.5 rounded-full" :style="{ width: (a.done/a.total*100) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const loading = ref(false)
const tlScale = ref<'week' | 'month'>('week')
const filterProjectId = ref<any>('')
const filterAssignee = ref<any>('')

const showTypes = reactive([
  { key: 'prd', label: 'PRD', visible: true },
  { key: 'task', label: 'Task', visible: true },
  { key: 'qc', label: 'QC Form', visible: true },
])

interface TimelineData {
  project_id: number
  project_name: string
  prds: any[]
  tasks: any[]
  qcForms: any[]
  milestones: any[]
}

const allData = ref<TimelineData[]>([])
const projects = ref<any[]>([])
const staffUsers = ref<any[]>([])

async function load() {
  loading.value = true
  try {
    const [projectsRes, usersRes] = await Promise.all([
      $fetch<any>('/api/projects', { query: { limit: 200 } }),
      $fetch<any>('/api/users', { query: { limit: 200 } }),
    ])
    projects.value = projectsRes?.data || []
    staffUsers.value = (usersRes?.data || []).filter((u: any) => u.is_active && u.role !== 'customer')

    const targetProjects = filterProjectId.value
      ? projects.value.filter(p => p.id == filterProjectId.value)
      : projects.value

    const results = await Promise.all(
      targetProjects.map((p: any) =>
        $fetch<any>(`/api/projects/${p.id}/timeline`).then((d: any) => ({
          project_id: p.id,
          project_name: p.name,
          prds: d.prds || [],
          tasks: d.tasks || [],
          qcForms: d.qcForms || [],
          milestones: d.milestones || [],
        })).catch(() => null)
      )
    )
    allData.value = results.filter(Boolean) as TimelineData[]
  } finally {
    loading.value = false
  }
}

// QC by task id (global)
const qcByTask = computed(() => {
  const map: Record<number, any[]> = {}
  for (const proj of allData.value) {
    for (const qc of proj.qcForms) {
      if (!map[qc.task_id]) map[qc.task_id] = []
      map[qc.task_id].push(qc)
    }
  }
  return map
})

// Milestones by PRD id (global)
const milestonesByPrd = computed(() => {
  const map: Record<number, any[]> = {}
  for (const proj of allData.value) {
    for (const m of proj.milestones) {
      if (!map[m.prd_id]) map[m.prd_id] = []
      map[m.prd_id].push(m)
    }
  }
  return map
})

interface GanttGroup {
  projectId: number
  projectName: string
  prdId: number | null
  prd: any | null
  tasks: any[]
  showProjectLabel: boolean
}

const filteredGroups = computed((): GanttGroup[] => {
  const groups: GanttGroup[] = []
  let lastProjectId: number | null = null

  for (const proj of allData.value) {
    if (filterProjectId.value && proj.project_id != filterProjectId.value) continue

    const tasksByPrd: Record<string, any[]> = {}
    for (const t of proj.tasks) {
      const k = String(t.prd_id ?? 'none')
      if (!tasksByPrd[k]) tasksByPrd[k] = []
      tasksByPrd[k].push(t)
    }

    let firstInProject = true

    // PRD groups
    for (const prd of proj.prds) {
      const tasks = (tasksByPrd[String(prd.id)] || []).filter((t: any) => {
        if (filterAssignee.value && (t.assigned_to == null || String(t.assigned_to) !== String(filterAssignee.value))) return false
        return true
      })
      const showProjectLabel = firstInProject && proj.project_id !== lastProjectId
      if (showProjectLabel) { lastProjectId = proj.project_id; firstInProject = false }
      groups.push({ projectId: proj.project_id, projectName: proj.project_name, prdId: prd.id, prd, tasks, showProjectLabel })
    }

    // Orphan tasks
    const orphans = (tasksByPrd['none'] || []).filter((t: any) => {
      if (filterAssignee.value && (t.assigned_to == null || String(t.assigned_to) !== String(filterAssignee.value))) return false
      return true
    })
    if (orphans.length) {
      const showProjectLabel = firstInProject && proj.project_id !== lastProjectId
      if (showProjectLabel) { lastProjectId = proj.project_id; firstInProject = false }
      groups.push({ projectId: proj.project_id, projectName: proj.project_name, prdId: null, prd: null, tasks: orphans, showProjectLabel })
    }
  }
  return groups
})

// Date range across all data
const tlDateRange = computed(() => {
  const dates: Date[] = []
  const push = (d: string | null) => { if (d) dates.push(new Date(d)) }
  for (const proj of allData.value) {
    for (const p of proj.prds) { push(p.planned_start_date); push(p.original_due_date); push(p.revised_due_date); push(p.actual_start_date); push(p.actual_end_date) }
    for (const t of proj.tasks) { push(t.planned_start_date); push(t.original_due_date); push(t.due_date); push(t.actual_start_date); push(t.actual_end_date) }
    for (const q of proj.qcForms) { push(q.original_due_date); push(q.revised_due_date); push(q.actual_start_date); push(q.actual_end_date) }
    for (const m of proj.milestones) { push(m.due_date) }
  }
  if (!dates.length) {
    const now = new Date()
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 3, 0) }
  }
  const minMs = Math.min(...dates.map(d => d.getTime()))
  const maxMs = Math.max(...dates.map(d => d.getTime()))
  const pad = 7 * 86400000
  return { start: new Date(minMs - pad), end: new Date(maxMs + pad) }
})

const tlColWidth = computed(() => tlScale.value === 'week' ? 120 : 80)

const tlColumns = computed(() => {
  const cols: { key: string; date: Date; label: string; isToday: boolean }[] = []
  const { start, end } = tlDateRange.value
  const today = new Date(); today.setHours(0,0,0,0)
  const cur = new Date(start)
  if (tlScale.value === 'week') {
    const day = cur.getDay(); const diff = day === 0 ? -6 : 1 - day
    cur.setDate(cur.getDate() + diff)
    cur.setHours(0,0,0,0)
    while (cur <= end) {
      const isToday = cur <= today && today < new Date(cur.getTime() + 7 * 86400000)
      cols.push({ key: cur.toISOString(), date: new Date(cur), label: cur.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), isToday })
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    cur.setDate(1); cur.setHours(0,0,0,0)
    while (cur <= end) {
      const isToday = cur.getFullYear() === today.getFullYear() && cur.getMonth() === today.getMonth()
      cols.push({ key: cur.toISOString(), date: new Date(cur), label: cur.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), isToday })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return cols
})

// Summary per assignee — uses the same isOverdue() logic as GanttBar for consistency
const { isOverdue } = useDate()
const assigneeSummary = computed(() => {
  const map: Record<string, { name: string; total: number; done: number; overdue: number }> = {}
  for (const proj of allData.value) {
    for (const t of proj.tasks) {
      const name = t.assigned_to_name
      if (!name) continue
      if (!map[name]) map[name] = { name, total: 0, done: 0, overdue: 0 }
      map[name].total++
      if (t.status === 'done') map[name].done++
      else {
        const end = t.revised_due_date || t.original_due_date || t.due_date
        if (isOverdue(end)) map[name].overdue++
      }
    }
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
})

function prdStatusClass(s: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', in_review: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700', in_progress: 'bg-indigo-100 text-indigo-700',
    done: 'bg-emerald-100 text-emerald-700',
  }
  return map[s] || 'bg-gray-100 text-gray-600'
}

function taskStatusClass(s: string) {
  const map: Record<string, string> = {
    backlog: 'bg-slate-100 text-slate-500', todo: 'bg-blue-50 text-blue-600',
    in_progress: 'bg-indigo-100 text-indigo-700', review: 'bg-amber-100 text-amber-700',
    in_qc: 'bg-purple-100 text-purple-700', done: 'bg-emerald-100 text-emerald-700',
  }
  return map[s] || 'bg-slate-100 text-slate-500'
}

watch(filterProjectId, () => load())

// Timeline data can go stale when a task/PRD/QC form is updated from another
// page/tab (e.g. reassigned), so refresh periodically and when the tab regains focus.
let refreshInterval: ReturnType<typeof setInterval> | null = null
function onVisibilityChange() {
  if (document.visibilityState === 'visible') load()
}

onMounted(() => {
  load()
  refreshInterval = setInterval(load, 60000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="space-y-4">

    <!-- Filter Card -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tanggal</label>
          <div class="flex items-center gap-1.5">
            <input v-model="filters.date_from" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
            <span class="text-xs text-slate-400 flex-shrink-0">—</span>
            <input v-model="filters.date_to" type="date" class="input text-xs py-1.5 flex-1 min-w-0" />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Project</label>
          <AppSelect
            v-model="filters.project_id"
            :options="[{ value: '', label: 'Semua Project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
            placeholder="Semua Project"
          />
        </div>

        <div class="flex flex-col gap-1 justify-end">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide invisible">Aktivitas</label>
          <label class="flex items-center gap-2 cursor-pointer h-9 px-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors w-fit">
            <input v-model="filters.only_active" type="checkbox" class="w-3.5 h-3.5 rounded accent-indigo-500" />
            <span class="text-sm text-slate-600">Hanya yang ada aktivitas (response/timelog)</span>
          </label>
        </div>

        <div class="flex flex-col gap-1 justify-end sm:col-span-2 lg:col-span-4">
          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide invisible">Aksi</label>
          <div class="flex items-center gap-2 flex-wrap">
            <AppRefreshButton :loading="loading" @click="handleRefresh" />
            <button @click="copyText" :disabled="!hasData" class="inline-flex items-center gap-1.5 btn-ghost text-xs border border-slate-200 disabled:opacity-40">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy Text
            </button>
            <button @click="exportExcel" :disabled="exporting || !hasData" class="inline-flex items-center gap-1.5 btn-ghost text-xs border border-slate-200 disabled:opacity-40">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!filters.date_from || !filters.date_to" class="card p-10 text-center text-sm text-slate-400">
      Pilih rentang tanggal terlebih dahulu.
    </div>
    <div v-else-if="loading" class="card p-10 text-center text-sm text-slate-400">
      Memuat data...
    </div>
    <div v-else-if="!groupedProjects.length" class="card p-10 text-center text-sm text-slate-400">
      Tidak ada data pada rentang tanggal ini.
    </div>

    <!-- Grouped by Project -->
    <div v-else class="space-y-4">
      <div v-for="proj in groupedProjects" :key="proj.id" class="card p-4">
        <h3 class="text-sm font-semibold text-slate-800 mb-3">🗂️ {{ proj.name }}</h3>

        <div v-for="bucket in proj.buckets" :key="bucket.key" class="mb-3 last:mb-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span :class="['badge text-white text-[10px]', BUCKET_COLORS[bucket.key]]">{{ BUCKET_LABELS[bucket.key] }}</span>
            <span class="text-xs text-slate-400">({{ bucket.items.length }})</span>
          </div>
          <ul class="space-y-1">
            <li v-for="item in bucket.items" :key="item.key" class="flex items-start gap-2 text-xs text-slate-600 pl-1">
              <span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide flex-shrink-0"
                :class="TYPE_BADGE_CLASS[item.type]">{{ TYPE_LABELS[item.type] }}</span>
              <span class="flex-1">
                {{ item.title }}
                <span class="text-slate-400">— {{ item.assignee || '—' }}</span>
                <span class="text-slate-400">({{ item.statusLabel }})</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import * as XLSX from 'xlsx'

definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const { toast } = useConfirm()

if (!auth.isStaffOrAdmin) {
  await navigateTo('/')
}

const filters = reactive({
  date_from: '',
  date_to: '',
  project_id: '',
  only_active: false,
})

const loading = ref(false)
const exporting = ref(false)
const raw = ref<{ tickets: any[]; tasks: any[]; qc_forms: any[]; projects: any[] }>({ tickets: [], tasks: [], qc_forms: [], projects: [] })

const { data: prd } = await useFetch('/api/projects')
const projects = computed(() => (prd.value as any)?.data || [])

const BUCKET_ORDER = ['done', 'progress', 'open'] as const
const BUCKET_LABELS: Record<string, string> = { done: '✅ Done', progress: '🔄 Progress', open: '🕓 Open' }
const BUCKET_COLORS: Record<string, string> = { done: 'bg-green-500', progress: 'bg-blue-500', open: 'bg-slate-400' }
const TYPE_LABELS: Record<string, string> = { ticket: 'Ticket', task: 'Task', qc: 'QC' }
const TYPE_BADGE_CLASS: Record<string, string> = {
  ticket: 'bg-indigo-50 text-indigo-700',
  task: 'bg-violet-50 text-violet-700',
  qc: 'bg-amber-50 text-amber-700',
}

function ticketBucket(row: any): 'done' | 'progress' | 'open' {
  if (row.is_resolved) return 'done'
  if (/progress|proses/i.test(row.status_name || '')) return 'progress'
  return 'open'
}
function taskBucket(row: any): 'done' | 'progress' | 'open' {
  if (row.status === 'done') return 'done'
  if (row.status === 'in_progress' || row.status === 'review') return 'progress'
  return 'open'
}
function qcBucket(row: any): 'done' | 'progress' | 'open' {
  if (row.status === 'completed') return 'done'
  return 'progress'
}

const hasData = computed(() => raw.value.tickets.length || raw.value.tasks.length || raw.value.qc_forms.length)

const groupedProjects = computed(() => {
  const projectMap = new Map<number, any>()
  for (const p of raw.value.projects) projectMap.set(p.id, p)

  const result: any[] = []
  for (const [projectId, project] of projectMap) {
    const items: Record<string, any[]> = { done: [], progress: [], open: [] }

    for (const t of raw.value.tickets.filter((r: any) => r.project_id === projectId)) {
      items[ticketBucket(t)].push({
        key: `ticket-${t.id}`, type: 'ticket', title: `${t.ticket_number} - ${t.title}`,
        assignee: t.assigned_to_name, statusLabel: t.status_name,
      })
    }
    for (const t of raw.value.tasks.filter((r: any) => r.project_id === projectId)) {
      items[taskBucket(t)].push({
        key: `task-${t.id}`, type: 'task', title: t.title,
        assignee: t.assigned_to_name, statusLabel: t.status,
      })
    }
    for (const q of raw.value.qc_forms.filter((r: any) => r.project_id === projectId)) {
      items[qcBucket(q)].push({
        key: `qc-${q.id}`, type: 'qc', title: q.task_title,
        assignee: q.checkers, statusLabel: q.status,
      })
    }

    const buckets = BUCKET_ORDER
      .map((key) => ({ key, items: items[key] }))
      .filter((b) => b.items.length)

    if (buckets.length) result.push({ id: projectId, name: project?.name || `Project #${projectId}`, buckets })
  }
  return result
})

function buildQuery() {
  const q: Record<string, any> = { from: filters.date_from, to: filters.date_to }
  if (filters.project_id) q.project_id = filters.project_id
  if (filters.only_active) q.only_active = '1'
  return q
}

async function fetchData() {
  if (!filters.date_from || !filters.date_to) return
  loading.value = true
  try {
    const res = await $fetch('/api/reports/weekly', { query: buildQuery() }) as any
    raw.value = res.data
  } finally {
    loading.value = false
  }
}

watchDebounced(filters, () => fetchData(), { debounce: 300, maxWait: 1000 })

async function handleRefresh() { await fetchData() }

function generateReportText(): string {
  const lines: string[] = [`📅 Weekly Report (${filters.date_from} – ${filters.date_to})`, '']
  for (const proj of groupedProjects.value) {
    lines.push(`🗂️ ${proj.name}`)
    for (const bucket of proj.buckets) {
      lines.push(`${BUCKET_LABELS[bucket.key]}:`)
      for (const item of bucket.items) {
        lines.push(`- [${TYPE_LABELS[item.type]}] ${item.title} (${item.assignee || '—'})${bucket.key === 'progress' ? ` — ${item.statusLabel}` : ''}`)
      }
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

async function copyText() {
  const text = generateReportText()
  await navigator.clipboard.writeText(text)
  toast('Teks berhasil disalin')
}

async function exportExcel() {
  exporting.value = true
  try {
    const wb = XLSX.utils.book_new()

    const ticketRows = raw.value.tickets.map((t: any) => ({
      Project: projects.value.find((p: any) => p.id === t.project_id)?.name || t.project_id,
      Ticket: t.ticket_number,
      Judul: t.title,
      Status: t.status_name,
      Assignee: t.assigned_to_name || '—',
      Bucket: BUCKET_LABELS[ticketBucket(t)],
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketRows), 'Tickets')

    const taskRows = raw.value.tasks.map((t: any) => ({
      Project: projects.value.find((p: any) => p.id === t.project_id)?.name || t.project_id,
      Task: t.title,
      Status: t.status,
      Assignee: t.assigned_to_name || '—',
      Bucket: BUCKET_LABELS[taskBucket(t)],
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), 'Tasks')

    const qcRows = raw.value.qc_forms.map((q: any) => ({
      Project: projects.value.find((p: any) => p.id === q.project_id)?.name || q.project_id,
      Task: q.task_title,
      Status: q.status,
      Checkers: q.checkers || '—',
      Bucket: BUCKET_LABELS[qcBucket(q)],
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(qcRows), 'QC Forms')

    XLSX.writeFile(wb, `weekly-report-${filters.date_from}-${filters.date_to}.xlsx`)
  } finally {
    exporting.value = false
  }
}
</script>

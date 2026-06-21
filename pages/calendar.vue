<template>
  <div class="flex gap-4 flex-col lg:flex-row">
    <!-- Unscheduled panel -->
    <div class="lg:w-72 flex-shrink-0">
      <div class="card p-4 sticky top-20">
        <!-- Tab toggle -->
        <div class="flex gap-1 mb-3 bg-slate-100 rounded-lg p-0.5">
          <button
            v-for="tab in ['ticket', 'task']" :key="tab"
            @click="panelTab = tab"
            :class="['flex-1 text-xs py-1 rounded-md font-medium transition-colors', panelTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
          >
            {{ tab === 'ticket' ? 'Tickets' : 'Tasks' }}
            <span class="ml-1 text-[10px]">({{ tab === 'ticket' ? filteredUnscheduledTickets.length : filteredUnscheduledTasks.length }})</span>
          </button>
        </div>
        <input v-model="search" class="input text-xs mb-3" :placeholder="panelTab === 'ticket' ? 'Cari ticket...' : 'Cari task...'" />

        <!-- Unscheduled tickets -->
        <div v-show="panelTab === 'ticket'" class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <div v-if="!filteredUnscheduledTickets.length" class="text-xs text-slate-400 text-center py-4">Tidak ada ticket</div>
          <div
            v-for="t in filteredUnscheduledTickets" :key="`tk-${t.id}`"
            draggable="true"
            @dragstart="onDragStart($event, t, 'ticket')"
            class="p-2.5 bg-white border border-slate-200 rounded-lg cursor-grab hover:border-primary-300 hover:shadow-sm transition-all text-xs"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <span class="priority-dot" :style="{ background: t.priority_color }" />
              <span class="font-mono text-slate-500">{{ t.ticket_number }}</span>
              <span class="badge text-white text-[10px] ml-auto" :style="{ background: t.status_color }">{{ t.status_name }}</span>
            </div>
            <p class="text-slate-700 font-medium leading-snug line-clamp-2">{{ t.title }}</p>
            <p class="text-slate-400 mt-1">{{ t.project_name }}</p>
          </div>
        </div>

        <!-- Unscheduled tasks -->
        <div v-show="panelTab === 'task'" class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <div v-if="!filteredUnscheduledTasks.length" class="text-xs text-slate-400 text-center py-4">Tidak ada task</div>
          <div
            v-for="t in filteredUnscheduledTasks" :key="`task-${t.id}`"
            draggable="true"
            @dragstart="onDragStart($event, t, 'task')"
            class="p-2.5 bg-white border border-slate-200 rounded-lg cursor-grab hover:border-indigo-300 hover:shadow-sm transition-all text-xs"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ background: taskStatusColor(t.status) }"></span>
              <span class="text-slate-500 capitalize">{{ taskStatusLabel(t.status) }}</span>
              <span v-if="t.assigned_to_name" class="ml-auto text-slate-400 truncate max-w-[80px]">{{ t.assigned_to_name }}</span>
            </div>
            <p class="text-slate-700 font-medium leading-snug line-clamp-2">{{ t.title }}</p>
            <p class="text-slate-400 mt-1">{{ t.project_name }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar -->
    <div class="flex-1 card p-4 min-w-0">
      <!-- Legend -->
      <div class="flex gap-4 mb-3 text-xs text-slate-500">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Ticket</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Task</span>
      </div>
      <FullCalendar v-if="calendarReady" :options="calendarOptions" class="ticketing-calendar" />
    </div>
  </div>
</template>

<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
definePageMeta({ middleware: 'auth' })

const tabs = useTabStore()
const router = useRouter()
const search = ref('')
const panelTab = ref<'ticket' | 'task'>('ticket')
const calendarReady = ref(false)
const dragging = ref<{ item: any; type: 'ticket' | 'task' } | null>(null)

const { data: tr, refresh: refreshTickets } = await useFetch('/api/tickets')
const allTickets = computed(() => (tr.value as any)?.data || [])

const { data: taskRes, refresh: refreshTasks } = await useFetch('/api/tasks')
const allTasks = computed(() => (taskRes.value as any)?.data || [])

// Tickets
const unscheduledTickets = computed(() => allTickets.value.filter((t: any) => !t.due_date?.trim()))
const scheduledTickets = computed(() => allTickets.value.filter((t: any) => t.due_date?.trim()))

const filteredUnscheduledTickets = computed(() => {
  if (!search.value) return unscheduledTickets.value
  const q = search.value.toLowerCase()
  return unscheduledTickets.value.filter((t: any) => t.title.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q))
})

// Tasks
const TASK_STATUS_COLORS: Record<string, string> = { backlog: '#94a3b8', todo: '#60a5fa', in_progress: '#f59e0b', review: '#a78bfa', done: '#22c55e' }
const TASK_STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' }
function taskStatusColor(s: string) { return TASK_STATUS_COLORS[s] ?? '#94a3b8' }
function taskStatusLabel(s: string) { return TASK_STATUS_LABELS[s] ?? s }

const unscheduledTasks = computed(() => allTasks.value.filter((t: any) => !t.due_date?.trim()))
const scheduledTasks = computed(() => allTasks.value.filter((t: any) => t.due_date?.trim()))

const filteredUnscheduledTasks = computed(() => {
  if (!search.value) return unscheduledTasks.value
  const q = search.value.toLowerCase()
  return unscheduledTasks.value.filter((t: any) => t.title.toLowerCase().includes(q) || t.project_name?.toLowerCase().includes(q))
})

// Calendar events
const calendarEvents = computed(() => [
  ...scheduledTickets.value.map((t: any) => ({
    id: `tk-${t.id}`,
    title: `🎫 ${t.ticket_number} — ${t.title}`,
    start: t.due_date?.slice(0, 10),
    backgroundColor: t.priority_color,
    borderColor: t.priority_color,
    textColor: '#fff',
    extendedProps: { ...t, _type: 'ticket' },
  })),
  ...scheduledTasks.value.map((t: any) => ({
    id: `task-${t.id}`,
    title: `✓ ${t.title}`,
    start: t.due_date?.slice(0, 10),
    backgroundColor: taskStatusColor(t.status),
    borderColor: taskStatusColor(t.status),
    textColor: '#fff',
    extendedProps: { ...t, _type: 'task' },
  })),
])

function onDragStart(e: DragEvent, item: any, type: 'ticket' | 'task') {
  dragging.value = { item, type }
  e.dataTransfer?.setData('text/plain', String(item.id))
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: 'id',
  height: 'auto',
  editable: true,
  droppable: true,
  events: calendarEvents.value,
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
  eventClick: (info: any) => {
    const p = info.event.extendedProps
    if (p._type === 'task') {
      router.push('/tasks')
    } else {
      tabs.openTab({ id: p.id, ticket_number: p.ticket_number, title: p.title })
    }
  },
  eventDrop: async (info: any) => {
    const raw = info.event.id
    const newDate = info.event.startStr
    if (raw.startsWith('task-')) {
      const id = raw.replace('task-', '')
      await $fetch(`/api/tasks/${id}`, { method: 'PUT', body: { due_date: newDate } })
      await refreshTasks()
    } else {
      const id = raw.replace('tk-', '')
      await $fetch(`/api/tickets/${id}`, { method: 'PUT', body: { due_date: new Date(newDate).toISOString() } })
      await refreshTickets()
    }
  },
  drop: async (info: any) => {
    if (!dragging.value) return
    const { item, type } = dragging.value
    const newDate = info.dateStr
    if (type === 'task') {
      await $fetch(`/api/tasks/${item.id}`, { method: 'PUT', body: { due_date: newDate } })
      await refreshTasks()
    } else {
      await $fetch(`/api/tickets/${item.id}`, { method: 'PUT', body: { due_date: new Date(newDate).toISOString() } })
      await refreshTickets()
    }
    dragging.value = null
  },
}))

onMounted(() => { calendarReady.value = true })
</script>

<style>
.ticketing-calendar .fc-toolbar-title { font-size: 1rem !important; font-weight: 600; }
.ticketing-calendar .fc-button { font-size: 0.75rem !important; padding: 4px 10px !important; background: white !important; color: #475569 !important; border-color: #e2e8f0 !important; }
.ticketing-calendar .fc-button:hover { background: #f8fafc !important; }
.ticketing-calendar .fc-button-active { background: #eef2ff !important; color: #4f46e5 !important; border-color: #c7d2fe !important; }
.ticketing-calendar .fc-event { border-radius: 6px; font-size: 11px; padding: 1px 4px; }
.ticketing-calendar .fc-daygrid-day:hover { background: #f8fafc; }
</style>

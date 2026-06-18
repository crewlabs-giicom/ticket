<template>
  <div class="flex gap-4 flex-col lg:flex-row">
    <!-- Unscheduled tickets panel -->
    <div class="lg:w-72 flex-shrink-0">
      <div class="card p-4 sticky top-20">
        <h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
          Belum Terjadwal
          <span class="badge bg-slate-100 text-slate-600 text-xs">{{ unscheduled.length }}</span>
        </h3>
        <input v-model="search" class="input text-xs mb-3" placeholder="Cari ticket..." />
        <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          <div v-if="!filteredUnscheduled.length" class="text-xs text-slate-400 text-center py-4">Tidak ada ticket</div>
          <div
            v-for="t in filteredUnscheduled" :key="t.id"
            draggable="true"
            @dragstart="onDragStart($event, t)"
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
      </div>
    </div>

    <!-- Calendar -->
    <div class="flex-1 card p-4 min-w-0">
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
const search = ref('')
const calendarReady = ref(false)
const dragging = ref<any>(null)

const { data: tr } = await useFetch('/api/tickets')
const allTickets = computed(() => (tr.value as any)?.data || [])

const unscheduled = computed(() => allTickets.value.filter((t: any) => !t.due_date || !t.due_date.trim()))
const scheduled = computed(() => allTickets.value.filter((t: any) => t.due_date && t.due_date.trim()))

const filteredUnscheduled = computed(() => {
  if (!search.value) return unscheduled.value
  return unscheduled.value.filter((t: any) => t.title.toLowerCase().includes(search.value.toLowerCase()) || t.ticket_number.toLowerCase().includes(search.value.toLowerCase()))
})

const calendarEvents = computed(() => scheduled.value.map((t: any) => ({
  id: String(t.id),
  title: `${t.ticket_number} — ${t.title}`,
  start: t.due_date?.slice(0, 10),
  backgroundColor: t.priority_color,
  borderColor: t.priority_color,
  textColor: '#fff',
  extendedProps: t
})))

function onDragStart(e: DragEvent, ticket: any) {
  dragging.value = ticket
  e.dataTransfer?.setData('text/plain', String(ticket.id))
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
    const t = info.event.extendedProps
    tabs.openTab({ id: t.id, ticket_number: t.ticket_number, title: t.title })
  },
  eventDrop: async (info: any) => {
    const id = info.event.id
    const newDate = info.event.startStr
    await $fetch(`/api/tickets/${id}`, { method: 'PUT', body: { due_date: new Date(newDate).toISOString() } })
  },
  drop: async (info: any) => {
    if (!dragging.value) return
    const newDate = info.dateStr
    await $fetch(`/api/tickets/${dragging.value.id}`, { method: 'PUT', body: { due_date: new Date(newDate).toISOString() } })
    dragging.value = null
    await refreshNuxtData()
  }
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

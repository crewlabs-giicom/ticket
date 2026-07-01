<template>
  <Transition name="timer-widget">
    <div
      v-if="store.hasTimer"
      class="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 w-72 select-none"
    >
      <!-- Header -->
      <div class="flex items-center gap-2 px-4 pt-3 pb-1">
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="store.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'"
        ></span>
        <span class="text-[11px] font-semibold uppercase tracking-wide"
          :class="store.isRunning ? 'text-emerald-600' : 'text-amber-500'">
          {{ store.isRunning ? 'Sedang berjalan' : 'Dijeda' }}
        </span>
      </div>

      <!-- Task info -->
      <div class="px-4 pb-2">
        <p class="text-sm font-semibold text-gray-800 leading-snug truncate">{{ store.taskName || 'Task' }}</p>
        <p v-if="store.ticketTitle" class="text-[11px] text-slate-400 truncate mt-0.5">{{ store.ticketTitle }}</p>
      </div>

      <!-- Elapsed time -->
      <div class="px-4 pb-3">
        <span class="text-2xl font-mono font-bold text-gray-700 tracking-tight">{{ formatSeconds(store.displayElapsed) }}</span>
      </div>

      <!-- Controls -->
      <div class="border-t border-slate-100 px-3 py-2 flex items-center gap-1.5">
        <!-- Pause (only when running) -->
        <button
          v-if="store.isRunning"
          @click="pause"
          :disabled="busy"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          Jeda
        </button>

        <!-- Resume (only when paused) -->
        <button
          v-if="store.isPaused"
          @click="resume"
          :disabled="busy"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Lanjutkan
        </button>

        <!-- Stop -->
        <button
          @click="stop"
          :disabled="busy"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors ml-auto"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
          Stop
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useActiveTimerStore } from '~/stores/activeTimer'

const store = useActiveTimerStore()
const busy = ref(false)

// Live tick for the widget's own display
let widgetInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  widgetInterval = setInterval(() => {
    if (store.isRunning && store.startedAt) {
      store.updateElapsed(Math.floor((Date.now() - new Date(store.startedAt).getTime()) / 1000))
    }
  }, 1000)
})

onUnmounted(() => { if (widgetInterval) clearInterval(widgetInterval) })

function formatSeconds(s: number) {
  if (!s || s < 0) return '0s'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}j ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

const apiBase = computed(() => {
  if (store.timerType === 'ticket') return `/api/tickets/${store.ticketId}/timelogs`
  if (store.timerType === 'qc') return `/api/qc-forms/${store.qcFormId}/timelogs`
  return `/api/tasks/${store.taskId}/timelogs`
})

const storageKey = computed(() => {
  if (store.timerType === 'ticket') return `ticket_timer_${store.ticketId}`
  if (store.timerType === 'qc') return `qc_timer_${store.qcFormId}`
  return `task_timer_${store.taskId}`
})

async function pause() {
  if (!store.logId) return
  busy.value = true
  try {
    const currentElapsed = store.elapsed
    await $fetch(`${apiBase.value}?log_id=${store.logId}`, { method: 'PUT' })
    localStorage.setItem(storageKey.value, JSON.stringify({
      paused: true,
      taskName: store.taskName,
      ticketTitle: store.ticketTitle,
      pausedElapsed: currentElapsed,
    }))
    if (store.timerType === 'ticket') {
      store.setPausedTicket(store.ticketId!, store.taskName, store.ticketTitle, currentElapsed)
    } else if (store.timerType === 'qc') {
      store.setPausedQc(store.qcFormId!, store.taskName, store.ticketTitle, currentElapsed)
    } else {
      store.setPaused(store.taskId!, store.taskName, store.ticketTitle, currentElapsed)
    }
  } finally {
    busy.value = false
  }
}

async function resume() {
  busy.value = true
  try {
    const entityId = store.timerType === 'ticket' ? store.ticketId!
      : store.timerType === 'qc' ? store.qcFormId!
      : store.taskId!
    const taskName = store.taskName
    const ticketTitle = store.ticketTitle
    localStorage.removeItem(storageKey.value)
    const res = await $fetch<any>(apiBase.value, { method: 'POST' })
    const startedAt = new Date(res.data.started_at)
    localStorage.setItem(storageKey.value, JSON.stringify({ logId: res.data.id, start: res.data.started_at }))
    if (store.timerType === 'ticket') {
      store.setActiveTicket(entityId, taskName, ticketTitle, res.data.id, startedAt)
    } else if (store.timerType === 'qc') {
      store.setActiveQc(entityId, taskName, ticketTitle, res.data.id, startedAt)
    } else {
      store.setActive(entityId, taskName, ticketTitle, res.data.id, startedAt)
    }
  } finally {
    busy.value = false
  }
}

async function stop() {
  busy.value = true
  try {
    const logId = store.logId
    const url = apiBase.value  // save before clearActive wipes timerType/ticketId
    localStorage.removeItem(storageKey.value)
    store.clearActive()
    if (logId) {
      await $fetch(`${url}?log_id=${logId}`, { method: 'PUT' })
    }
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.timer-widget-enter-active,
.timer-widget-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.timer-widget-enter-from,
.timer-widget-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>

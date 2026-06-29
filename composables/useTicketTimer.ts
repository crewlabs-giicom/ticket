import { useActiveTimerStore } from '~/stores/activeTimer'

export function useTicketTimer(ticketId: Ref<number>, onStatusChange?: (statusId: number) => void) {
  const store = useActiveTimerStore()

  const activeLogId = ref<number | null>(null)
  const startedAt = ref<Date | null>(null)
  const elapsed = ref(0)
  const timelogs = ref<any[]>([])
  const loading = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  const storageKey = computed(() => `ticket_timer_${ticketId.value}`)
  const isPaused = ref(false)

  const elapsedFormatted = computed(() => formatSeconds(elapsed.value))
  // Hitung dari timelogs yg tampil agar konsisten dengan history
  const totalSeconds = computed(() =>
    timelogs.value.reduce((s: number, l: any) => s + (l.duration_seconds || 0), 0)
  )
  const totalFormatted = computed(() => formatSeconds(totalSeconds.value + (activeLogId.value ? elapsed.value : 0)))
  const isRunning = computed(() => activeLogId.value !== null)

  function formatSeconds(s: number) {
    if (!s || s < 0) return '0s'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}j ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  function startTick() {
    if (interval) clearInterval(interval)
    interval = setInterval(() => {
      if (startedAt.value) {
        elapsed.value = Math.floor((Date.now() - startedAt.value.getTime()) / 1000)
        store.updateElapsed(elapsed.value)
      }
    }, 1000)
  }

  function clearTimer() {
    activeLogId.value = null
    startedAt.value = null
    elapsed.value = 0
    if (interval) { clearInterval(interval); interval = null }
    localStorage.removeItem(storageKey.value)
  }

  async function fetchLogs() {
    loading.value = true
    try {
      const res = await $fetch<any>(`/api/tickets/${ticketId.value}/timelogs`)
      timelogs.value = res.data || []
      // totalSeconds dihitung dari timelogs (computed), tidak dari API
      const active = res.active_log
      if (active) {
        activeLogId.value = active.id
        startedAt.value = new Date(active.started_at)
        elapsed.value = Math.floor((Date.now() - startedAt.value.getTime()) / 1000)
        localStorage.setItem(storageKey.value, JSON.stringify({ logId: active.id, start: active.started_at }))
        isPaused.value = false
        startTick()
        store.setActiveTicket(
          ticketId.value,
          active.ticket_name || '',
          active.ticket_title || '',
          active.id,
          startedAt.value
        )
      } else {
        const raw = localStorage.getItem(storageKey.value)
        if (raw) {
          try {
            const saved = JSON.parse(raw)
            if (saved.paused) {
              isPaused.value = true
              store.setPausedTicket(ticketId.value, saved.taskName || '', saved.ticketTitle || '', saved.pausedElapsed || 0)
            } else {
              isPaused.value = false
              clearTimer()
              if (store.timerType === 'ticket' && store.ticketId === ticketId.value) store.clearActive()
            }
          } catch { isPaused.value = false; clearTimer() }
        } else {
          isPaused.value = false
          clearTimer()
          if (store.timerType === 'ticket' && store.ticketId === ticketId.value) store.clearActive()
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function start(autoStatusId?: number) {
    const res = await $fetch<any>(`/api/tickets/${ticketId.value}/timelogs`, { method: 'POST' })
    activeLogId.value = res.data.id
    startedAt.value = new Date(res.data.started_at)
    elapsed.value = 0
    localStorage.setItem(storageKey.value, JSON.stringify({ logId: res.data.id, start: res.data.started_at }))
    startTick()
    if (autoStatusId) {
      await $fetch(`/api/tickets/${ticketId.value}`, { method: 'PUT', body: { status_id: autoStatusId } })
      onStatusChange?.(autoStatusId)
    }
    await fetchLogs()
  }

  async function pause() {
    if (!activeLogId.value) return
    const logId = activeLogId.value
    const currentElapsed = elapsed.value
    const ticketName = (store.timerType === 'ticket' && store.ticketId === ticketId.value) ? store.taskName : ''
    const ticketTitleVal = (store.timerType === 'ticket' && store.ticketId === ticketId.value) ? store.ticketTitle : ''
    if (interval) { clearInterval(interval); interval = null }
    activeLogId.value = null
    startedAt.value = null
    await $fetch(`/api/tickets/${ticketId.value}/timelogs?log_id=${logId}`, { method: 'PUT' })
    localStorage.setItem(storageKey.value, JSON.stringify({
      paused: true,
      taskName: ticketName,
      ticketTitle: ticketTitleVal,
      pausedElapsed: currentElapsed,
    }))
    isPaused.value = true
    store.setPausedTicket(ticketId.value, ticketName, ticketTitleVal, currentElapsed)
    await fetchLogs()
  }

  async function resume() {
    localStorage.removeItem(storageKey.value)
    await start()
  }

  async function stop() {
    isPaused.value = false
    if (!activeLogId.value) {
      clearTimer()
      if (store.timerType === 'ticket' && store.ticketId === ticketId.value) store.clearActive()
      return
    }
    const logId = activeLogId.value
    clearTimer()
    try {
      await $fetch(`/api/tickets/${ticketId.value}/timelogs?log_id=${logId}`, { method: 'PUT' })
    } finally {
      if (store.timerType === 'ticket' && store.ticketId === ticketId.value) store.clearActive()
      await fetchLogs()
    }
  }

  // Sync local state when widget stops/pauses this timer externally
  watch(
    () => [
      store.timerType === 'ticket' && store.ticketId === ticketId.value,
      store.logId,
      store.isPaused,
    ] as const,
    ([isOurs, _logId, paused]) => {
      if (!isOurs) {
        // Widget switched to another timer or stopped ours
        if (activeLogId.value !== null || isPaused.value) {
          if (interval) { clearInterval(interval); interval = null }
          activeLogId.value = null
          startedAt.value = null
          elapsed.value = 0
          isPaused.value = false
          fetchLogs()
        }
        return
      }
      // Widget paused our timer
      if (paused && activeLogId.value !== null) {
        if (interval) { clearInterval(interval); interval = null }
        activeLogId.value = null
        startedAt.value = null
        isPaused.value = true
      }
    }
  )

  onUnmounted(() => { if (interval) clearInterval(interval) })

  return { timelogs, totalSeconds, totalFormatted, elapsedFormatted, isRunning, isPaused, loading, elapsed, start, pause, resume, stop, fetchLogs, formatSeconds, storageKey }
}

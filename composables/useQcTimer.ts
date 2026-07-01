import { useActiveTimerStore } from '~/stores/activeTimer'

export function useQcTimer(qcFormId: Ref<number>) {
  const store = useActiveTimerStore()

  const activeLogId = ref<number | null>(null)
  const startedAt = ref<Date | null>(null)
  const elapsed = ref(0)
  const timelogs = ref<any[]>([])
  const loading = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  const storageKey = computed(() => `qc_timer_${qcFormId.value}`)
  const isPaused = ref(false)

  const elapsedFormatted = computed(() => formatSeconds(elapsed.value))
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
      const res = await $fetch<any>(`/api/qc-forms/${qcFormId.value}/timelogs`)
      timelogs.value = res.data || []
      const active = res.active_log
      if (active) {
        activeLogId.value = active.id
        startedAt.value = new Date(active.started_at)
        elapsed.value = Math.floor((Date.now() - startedAt.value.getTime()) / 1000)
        localStorage.setItem(storageKey.value, JSON.stringify({ logId: active.id, start: active.started_at }))
        isPaused.value = false
        startTick()
        store.setActiveQc(
          qcFormId.value,
          `QC Form #${active.form_sequence || qcFormId.value}`,
          active.task_title || '',
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
              store.setPausedQc(qcFormId.value, saved.formLabel || '', saved.taskTitle || '', saved.pausedElapsed || 0)
            } else {
              isPaused.value = false
              clearTimer()
              if (store.timerType === 'qc' && store.qcFormId === qcFormId.value) store.clearActive()
            }
          } catch { isPaused.value = false; clearTimer() }
        } else {
          isPaused.value = false
          clearTimer()
          if (store.timerType === 'qc' && store.qcFormId === qcFormId.value) store.clearActive()
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function start() {
    const res = await $fetch<any>(`/api/qc-forms/${qcFormId.value}/timelogs`, { method: 'POST' })
    activeLogId.value = res.data.id
    startedAt.value = new Date(res.data.started_at)
    elapsed.value = 0
    localStorage.setItem(storageKey.value, JSON.stringify({ logId: res.data.id, start: res.data.started_at }))
    startTick()
    await fetchLogs()
  }

  async function pause() {
    if (!activeLogId.value) return
    const logId = activeLogId.value
    const currentElapsed = elapsed.value
    const formLabel = store.timerType === 'qc' && store.qcFormId === qcFormId.value ? store.taskName : ''
    const taskTitle = store.timerType === 'qc' && store.qcFormId === qcFormId.value ? store.ticketTitle : ''
    if (interval) { clearInterval(interval); interval = null }
    activeLogId.value = null
    startedAt.value = null
    await $fetch(`/api/qc-forms/${qcFormId.value}/timelogs?log_id=${logId}`, { method: 'PUT' })
    localStorage.setItem(storageKey.value, JSON.stringify({
      paused: true, formLabel, taskTitle, pausedElapsed: currentElapsed,
    }))
    isPaused.value = true
    store.setPausedQc(qcFormId.value, formLabel, taskTitle, currentElapsed)
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
      if (store.timerType === 'qc' && store.qcFormId === qcFormId.value) store.clearActive()
      return
    }
    const logId = activeLogId.value
    clearTimer()
    if (store.timerType === 'qc' && store.qcFormId === qcFormId.value) store.clearActive()
    await $fetch(`/api/qc-forms/${qcFormId.value}/timelogs?log_id=${logId}`, { method: 'PUT' })
    await fetchLogs()
  }

  // Sync when widget stops/pauses this timer externally
  watch(
    () => [
      store.timerType === 'qc' && store.qcFormId === qcFormId.value,
      store.logId,
      store.isPaused,
    ] as const,
    ([isOurs, _logId, paused]) => {
      if (!isOurs) {
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

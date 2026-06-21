export function useTaskTimer(taskId: Ref<number>) {
  const activeLogId = ref<number | null>(null)
  const startedAt = ref<Date | null>(null)
  const elapsed = ref(0)
  const timelogs = ref<any[]>([])
  const totalSeconds = ref(0)
  const loading = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  const storageKey = computed(() => `task_timer_${taskId.value}`)

  const elapsedFormatted = computed(() => formatSeconds(elapsed.value))
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
      const res = await $fetch<any>(`/api/tasks/${taskId.value}/timelogs`)
      timelogs.value = res.data || []
      totalSeconds.value = res.total_seconds || 0
      const active = res.active_log
      if (active) {
        activeLogId.value = active.id
        startedAt.value = new Date(active.started_at)
        elapsed.value = Math.floor((Date.now() - startedAt.value.getTime()) / 1000)
        localStorage.setItem(storageKey.value, JSON.stringify({ logId: active.id, start: active.started_at }))
        startTick()
      } else {
        // No active log on server — clear local state and localStorage
        clearTimer()
      }
    } finally {
      loading.value = false
    }
  }

  async function start() {
    const res = await $fetch<any>(`/api/tasks/${taskId.value}/timelogs`, { method: 'POST' })
    activeLogId.value = res.data.id
    startedAt.value = new Date(res.data.started_at)
    elapsed.value = 0
    localStorage.setItem(storageKey.value, JSON.stringify({ logId: res.data.id, start: res.data.started_at }))
    startTick()
    await fetchLogs()
  }

  async function stop() {
    if (!activeLogId.value) return
    const logId = activeLogId.value
    clearTimer()
    await $fetch(`/api/tasks/${taskId.value}/timelogs?log_id=${logId}`, { method: 'PUT' })
    await fetchLogs()
  }

  onUnmounted(() => { if (interval) clearInterval(interval) })

  return { timelogs, totalSeconds, totalFormatted, elapsedFormatted, isRunning, loading, elapsed, start, stop, fetchLogs, formatSeconds }
}

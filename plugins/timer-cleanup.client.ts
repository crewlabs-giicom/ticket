// Global timer cleanup plugin — stops active task timers when tab/browser closes
// Uses sendBeacon so the request completes even during page unload

export default defineNuxtPlugin(() => {
  function stopAllActiveTimers() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('task_timer_')) continue
      try {
        const { logId } = JSON.parse(localStorage.getItem(key) || '{}')
        if (logId) {
          navigator.sendBeacon('/api/tasks/timelogs/stop', JSON.stringify({ log_id: logId }))
          localStorage.removeItem(key)
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // Stop when tab becomes hidden (minimize, switch tab, lock screen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopAllActiveTimers()
    }
  })

  // Stop when browser/tab is closed
  window.addEventListener('beforeunload', () => {
    stopAllActiveTimers()
  })
})

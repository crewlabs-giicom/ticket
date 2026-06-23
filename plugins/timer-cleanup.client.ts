// Global timer cleanup plugin — stops active task timers when tab/browser closes
// Uses sendBeacon so the request completes even during page unload

export default defineNuxtPlugin(() => {
  function stopAllActiveTimers() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('task_timer_')) continue
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}')
        // Only stop running timers (not paused ones — paused have no active DB log)
        if (saved.logId && !saved.paused) {
          navigator.sendBeacon('/api/tasks/timelogs/stop', JSON.stringify({ log_id: saved.logId }))
        }
        localStorage.removeItem(key)
      } catch { /* ignore parse errors */ }
    }
  }

  // Stop only when browser/tab is actually closed (not on tab switch or minimize)
  window.addEventListener('beforeunload', () => {
    stopAllActiveTimers()
  })
})

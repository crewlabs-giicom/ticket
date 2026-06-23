import { defineStore } from 'pinia'

interface ActiveTimerState {
  taskId: number | null
  taskName: string
  ticketTitle: string
  logId: number | null
  startedAt: Date | null
  elapsed: number
  isPaused: boolean
  pausedElapsed: number
}

export const useActiveTimerStore = defineStore('activeTimer', {
  state: (): ActiveTimerState => ({
    taskId: null,
    taskName: '',
    ticketTitle: '',
    logId: null,
    startedAt: null,
    elapsed: 0,
    isPaused: false,
    pausedElapsed: 0,
  }),

  getters: {
    isRunning: (state) => state.taskId !== null && !state.isPaused && state.logId !== null,
    hasTimer: (state) => state.taskId !== null,
    displayElapsed: (state) => state.isPaused ? state.pausedElapsed : state.elapsed,
  },

  actions: {
    setActive(taskId: number, taskName: string, ticketTitle: string, logId: number, startedAt: Date) {
      this.taskId = taskId
      this.taskName = taskName
      this.ticketTitle = ticketTitle
      this.logId = logId
      this.startedAt = startedAt
      this.isPaused = false
      this.pausedElapsed = 0
      this.elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    },

    setPaused(taskId: number, taskName: string, ticketTitle: string, pausedElapsed: number) {
      this.taskId = taskId
      this.taskName = taskName
      this.ticketTitle = ticketTitle
      this.logId = null
      this.startedAt = null
      this.isPaused = true
      this.pausedElapsed = pausedElapsed
      this.elapsed = 0
    },

    updateElapsed(elapsed: number) {
      this.elapsed = elapsed
    },

    clearActive() {
      this.taskId = null
      this.taskName = ''
      this.ticketTitle = ''
      this.logId = null
      this.startedAt = null
      this.elapsed = 0
      this.isPaused = false
      this.pausedElapsed = 0
    },
  },
})

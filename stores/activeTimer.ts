import { defineStore } from 'pinia'

interface ActiveTimerState {
  timerType: 'task' | 'ticket' | 'qc'
  taskId: number | null
  ticketId: number | null
  qcFormId: number | null
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
    timerType: 'task',
    taskId: null,
    ticketId: null,
    qcFormId: null,
    taskName: '',
    ticketTitle: '',
    logId: null,
    startedAt: null,
    elapsed: 0,
    isPaused: false,
    pausedElapsed: 0,
  }),

  getters: {
    isRunning: (state) => (state.taskId !== null || state.ticketId !== null || state.qcFormId !== null) && !state.isPaused && state.logId !== null,
    hasTimer: (state) => state.taskId !== null || state.ticketId !== null || state.qcFormId !== null,
    displayElapsed: (state) => state.isPaused ? state.pausedElapsed : state.elapsed,
    entityId: (state) => state.timerType === 'ticket' ? state.ticketId : state.timerType === 'qc' ? state.qcFormId : state.taskId,
  },

  actions: {
    setActive(taskId: number, taskName: string, ticketTitle: string, logId: number, startedAt: Date) {
      this.timerType = 'task'
      this.taskId = taskId
      this.ticketId = null
      this.taskName = taskName
      this.ticketTitle = ticketTitle
      this.logId = logId
      this.startedAt = startedAt
      this.isPaused = false
      this.pausedElapsed = 0
      this.elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    },

    setActiveTicket(ticketId: number, ticketNumber: string, ticketTitle: string, logId: number, startedAt: Date) {
      this.timerType = 'ticket'
      this.ticketId = ticketId
      this.taskId = null
      this.taskName = ticketNumber
      this.ticketTitle = ticketTitle
      this.logId = logId
      this.startedAt = startedAt
      this.isPaused = false
      this.pausedElapsed = 0
      this.elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    },

    setPaused(taskId: number, taskName: string, ticketTitle: string, pausedElapsed: number) {
      this.timerType = 'task'
      this.taskId = taskId
      this.ticketId = null
      this.taskName = taskName
      this.ticketTitle = ticketTitle
      this.logId = null
      this.startedAt = null
      this.isPaused = true
      this.pausedElapsed = pausedElapsed
      this.elapsed = 0
    },

    setPausedTicket(ticketId: number, ticketNumber: string, ticketTitle: string, pausedElapsed: number) {
      this.timerType = 'ticket'
      this.ticketId = ticketId
      this.taskId = null
      this.taskName = ticketNumber
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

    setActiveQc(qcFormId: number, formLabel: string, taskTitle: string, logId: number, startedAt: Date) {
      this.timerType = 'qc'
      this.qcFormId = qcFormId
      this.taskId = null
      this.ticketId = null
      this.taskName = formLabel
      this.ticketTitle = taskTitle
      this.logId = logId
      this.startedAt = startedAt
      this.isPaused = false
      this.pausedElapsed = 0
      this.elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    },

    setPausedQc(qcFormId: number, formLabel: string, taskTitle: string, pausedElapsed: number) {
      this.timerType = 'qc'
      this.qcFormId = qcFormId
      this.taskId = null
      this.ticketId = null
      this.taskName = formLabel
      this.ticketTitle = taskTitle
      this.logId = null
      this.startedAt = null
      this.isPaused = true
      this.pausedElapsed = pausedElapsed
      this.elapsed = 0
    },

    clearActive() {
      this.timerType = 'task'
      this.taskId = null
      this.ticketId = null
      this.qcFormId = null
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

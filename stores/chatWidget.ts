import { defineStore } from 'pinia'

export interface OpenTicket {
  ticketId: number
  ticketNumber: string
  title: string
  mode: 'minimized' | 'expanded'
}

export const useChatWidgetStore = defineStore('chatWidget', () => {
  const _userId = ref<number | null>(null)
  const openTickets = ref<OpenTicket[]>([])
  const unreadCounts = ref<Record<number, number>>({})

  function initForUser(id: number) {
    if (_userId.value !== null && _userId.value !== id) {
      openTickets.value = []
      unreadCounts.value = {}
    }
    _userId.value = id
  }

  function addTicketMinimized(ticket: { ticketId: number; ticketNumber: string; title: string }) {
    const existing = openTickets.value.find(t => t.ticketId === ticket.ticketId)
    if (!existing) {
      openTickets.value.push({ ...ticket, mode: 'minimized' })
    }
  }

  function openTicket(ticket: { ticketId: number; ticketNumber: string; title: string }) {
    const existing = openTickets.value.find(t => t.ticketId === ticket.ticketId)
    if (existing) {
      openTickets.value.forEach(t => { t.mode = 'minimized' })
      existing.mode = 'expanded'
      return
    }
    openTickets.value.forEach(t => { t.mode = 'minimized' })
    openTickets.value.push({ ...ticket, mode: 'expanded' })
  }

  function closeTicket(ticketId: number) {
    openTickets.value = openTickets.value.filter(t => t.ticketId !== ticketId)
    const counts = { ...unreadCounts.value }
    delete counts[ticketId]
    unreadCounts.value = counts
  }

  function toggleExpand(ticketId: number) {
    const ticket = openTickets.value.find(t => t.ticketId === ticketId)
    if (!ticket) return
    if (ticket.mode === 'expanded') {
      ticket.mode = 'minimized'
    } else {
      openTickets.value.forEach(t => { t.mode = 'minimized' })
      ticket.mode = 'expanded'
    }
  }

  function markRead(ticketId: number) {
    const counts = { ...unreadCounts.value }
    delete counts[ticketId]
    unreadCounts.value = counts
  }

  function incrementUnread(ticketId: number) {
    unreadCounts.value = { ...unreadCounts.value, [ticketId]: (unreadCounts.value[ticketId] || 0) + 1 }
  }

  // Live message bus for the expanded thread — not persisted
  const incomingMessage = ref<any>(null)

  function pushIncoming(msg: any) {
    incomingMessage.value = msg
  }

  function clearAll() {
    openTickets.value = []
    unreadCounts.value = {}
    _userId.value = null
  }

  return { _userId, openTickets, unreadCounts, incomingMessage, initForUser, addTicketMinimized, openTicket, closeTicket, toggleExpand, markRead, incrementUnread, pushIncoming, clearAll }
}, {
  persist: {
    key: 'chat-widget',
    pick: ['_userId', 'openTickets', 'unreadCounts'] as string[],
  },
})

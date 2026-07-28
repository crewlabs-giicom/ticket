import { defineStore } from 'pinia'

export const useTicketUnreadStore = defineStore('ticketUnread', () => {
  const unread = ref<Record<number, true>>({})

  function markUnread(ticketId: number) {
    unread.value = { ...unread.value, [ticketId]: true }
  }

  function clear(ticketId: number) {
    if (!unread.value[ticketId]) return
    const next = { ...unread.value }
    delete next[ticketId]
    unread.value = next
  }

  function has(ticketId: number) {
    return !!unread.value[ticketId]
  }

  return { unread, markUnread, clear, has }
})

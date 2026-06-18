import { defineStore } from 'pinia'

interface Tab { id: number; ticket_number: string; title: string; hasUnread: boolean; pinned: boolean }

export const useTabStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<number | null>(null)

  function openTab(ticket: { id: number; ticket_number: string; title: string }) {
    const exists = tabs.value.find(t => t.id === ticket.id)
    if (!exists) {
      tabs.value.push({ id: ticket.id, ticket_number: ticket.ticket_number, title: ticket.title, hasUnread: false, pinned: false })
    }
    activeTabId.value = ticket.id
    navigateTo(`/tickets/${ticket.id}`)
  }

  function closeTab(id: number) {
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const pinned = tabs.value[idx].pinned
    if (pinned) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[idx]?.id || tabs.value[idx - 1]?.id || null
      if (activeTabId.value) navigateTo(`/tickets/${activeTabId.value}`)
      else navigateTo('/tickets')
    }
  }

  function togglePin(id: number) {
    const t = tabs.value.find(t => t.id === id)
    if (t) t.pinned = !t.pinned
  }

  function markUnread(ticketId: number) {
    const t = tabs.value.find(t => t.id === ticketId)
    if (t && t.id !== activeTabId.value) t.hasUnread = true
  }

  function clearUnread(ticketId: number) {
    const t = tabs.value.find(t => t.id === ticketId)
    if (t) t.hasUnread = false
  }

  return { tabs, activeTabId, openTab, closeTab, togglePin, markUnread, clearUnread }
})

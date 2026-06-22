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

  // Add tab without navigating (used for restoring pinned tabs on load)
  function addTab(ticket: { id: number; ticket_number: string; title: string }, pinned = false) {
    const existing = tabs.value.find(t => t.id === ticket.id)
    if (existing) {
      if (pinned) existing.pinned = true
      return
    }
    tabs.value.push({ id: ticket.id, ticket_number: ticket.ticket_number, title: ticket.title, hasUnread: false, pinned })
  }

  function closeTab(id: number) {
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    if (tabs.value[idx].pinned) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[idx]?.id || tabs.value[idx - 1]?.id || null
      if (activeTabId.value) navigateTo(`/tickets/${activeTabId.value}`)
      else navigateTo('/tickets')
    }
  }

  async function togglePin(id: number) {
    const t = tabs.value.find(t => t.id === id)
    if (!t) return
    const willPin = !t.pinned
    t.pinned = willPin
    try {
      if (willPin) {
        await $fetch('/api/me/pins', {
          method: 'POST',
          body: { ticket_id: id, ticket_number: t.ticket_number, title: t.title }
        })
      } else {
        await $fetch('/api/me/pins', { method: 'DELETE', body: { ticket_id: id } })
      }
    } catch {
      // Revert on error
      t.pinned = !willPin
    }
  }

  async function loadPinnedTabs() {
    try {
      const res = await $fetch<any>('/api/me/pins')
      const pins: any[] = res?.data ?? []
      for (const pin of pins) {
        addTab({ id: pin.ticket_id, ticket_number: pin.ticket_number, title: pin.title }, true)
      }
    } catch {}
  }

  function markUnread(ticketId: number) {
    const t = tabs.value.find(t => t.id === ticketId)
    if (t && t.id !== activeTabId.value) t.hasUnread = true
  }

  function clearUnread(ticketId: number) {
    const t = tabs.value.find(t => t.id === ticketId)
    if (t) t.hasUnread = false
  }

  return { tabs, activeTabId, openTab, addTab, closeTab, togglePin, loadPinnedTabs, markUnread, clearUnread }
})

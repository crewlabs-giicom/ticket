import { defineStore } from 'pinia'

interface Tab { id: number; ticket_number: string; title: string; hasUnread: boolean; pinned: boolean }
interface PageTab { path: string; label: string; icon: string; pinned: boolean }

export const useTabStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<number | null>(null)
  const pageTabs = ref<PageTab[]>([])

  function openTab(ticket: { id: number; ticket_number: string; title: string }) {
    const exists = tabs.value.find(t => t.id === ticket.id)
    if (!exists) {
      tabs.value.push({ id: ticket.id, ticket_number: ticket.ticket_number, title: ticket.title, hasUnread: false, pinned: false })
    } else {
      if (ticket.ticket_number) exists.ticket_number = ticket.ticket_number
      if (ticket.title) exists.title = ticket.title
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

  function openPageTab(page: { path: string; label: string; icon: string }) {
    if (!pageTabs.value.find(p => p.path === page.path)) {
      pageTabs.value.push({ ...page, pinned: false })
    }
  }

  function closePageTab(path: string) {
    const tab = pageTabs.value.find(p => p.path === path)
    if (tab?.pinned) return
    const idx = pageTabs.value.findIndex(p => p.path === path)
    if (idx !== -1) pageTabs.value.splice(idx, 1)
  }

  async function togglePagePin(path: string) {
    const tab = pageTabs.value.find(p => p.path === path)
    if (!tab) return
    const willPin = !tab.pinned
    tab.pinned = willPin
    try {
      if (willPin) {
        await $fetch('/api/me/page-pins', { method: 'POST', body: { path: tab.path, label: tab.label, icon: tab.icon } })
      } else {
        await $fetch('/api/me/page-pins', { method: 'DELETE', body: { path: tab.path } })
      }
    } catch { tab.pinned = !willPin }
  }

  async function loadPinnedPageTabs() {
    try {
      const res = await $fetch<any>('/api/me/page-pins')
      for (const p of res?.data ?? []) {
        if (!pageTabs.value.find(t => t.path === p.path)) {
          pageTabs.value.push({ path: p.path, label: p.label, icon: p.icon, pinned: true })
        }
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

  return { tabs, activeTabId, openTab, addTab, closeTab, togglePin, loadPinnedTabs, markUnread, clearUnread, pageTabs, openPageTab, closePageTab, togglePagePin, loadPinnedPageTabs }
}, {
  persist: {
    key: 'tabs',
    pick: ['tabs', 'activeTabId'] as string[],
  },
})

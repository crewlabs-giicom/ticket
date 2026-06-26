import { defineStore } from 'pinia'

export interface WishlistItem {
  id: number
  wishlist_id: number
  content: string
  is_checked: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface Wishlist {
  id: number
  user_id: number
  title: string
  color: string
  is_pinned: boolean
  pin_x: number | null
  pin_y: number | null
  is_minimized: boolean
  items: WishlistItem[]
  created_at: string
  updated_at: string
}

export const useWishlistStore = defineStore('wishlist', () => {
  const notes = ref<Wishlist[]>([])
  const loading = ref(false)

  // Full page: which note is focused for editing
  const focusedNoteId = ref<number | null>(null)

  // Select mode for ticket creation
  const isSelectMode = ref(false)
  const selectedItemIds = ref<Set<number>>(new Set())
  const showTicketModal = ref(false)
  const ticketSourceNoteId = ref<number | null>(null)

  const pinnedNotes = computed(() => notes.value.filter(n => n.is_pinned))
  const totalUnchecked = computed(() =>
    notes.value.flatMap(n => n.items).filter(i => !i.is_checked).length
  )

  async function fetchNotes() {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Wishlist[] }>('/api/wishlists')
      notes.value = res.data
    } catch {
      // silently ignore (e.g. 401 on first load before auth ready)
    } finally {
      loading.value = false
    }
  }

  async function createNote(title = 'Catatan', color = '#fef08a') {
    const res = await $fetch<{ success: boolean; data: Wishlist }>('/api/wishlists', {
      method: 'POST', body: { title, color },
    })
    notes.value.push(res.data)
    focusedNoteId.value = res.data.id
    return res.data
  }

  async function updateNote(id: number, patch: Partial<Omit<Wishlist, 'items' | 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const res = await $fetch<{ success: boolean; data: Wishlist }>(`/api/wishlists/${id}`, {
      method: 'PUT', body: patch,
    })
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) Object.assign(notes.value[idx], res.data)
  }

  async function deleteNote(id: number) {
    await $fetch(`/api/wishlists/${id}`, { method: 'DELETE' })
    notes.value = notes.value.filter(n => n.id !== id)
    if (focusedNoteId.value === id) focusedNoteId.value = null
  }

  async function pinNote(id: number) {
    await updateNote(id, { is_pinned: true })
  }

  async function unpinNote(id: number) {
    await updateNote(id, { is_pinned: false, is_minimized: false })
  }

  async function savePinPosition(id: number, x: number, y: number) {
    await $fetch(`/api/wishlists/${id}`, { method: 'PUT', body: { pin_x: Math.round(x), pin_y: Math.round(y) } })
    const note = notes.value.find(n => n.id === id)
    if (note) { note.pin_x = Math.round(x); note.pin_y = Math.round(y) }
  }

  async function toggleMinimize(id: number, val: boolean) {
    await updateNote(id, { is_minimized: val })
  }

  async function addItem(wishlistId: number, content: string) {
    const res = await $fetch<{ success: boolean; data: WishlistItem }>(`/api/wishlists/${wishlistId}/items`, {
      method: 'POST', body: { content },
    })
    const note = notes.value.find(n => n.id === wishlistId)
    if (note) note.items.push(res.data)
    return res.data
  }

  async function updateItem(wishlistId: number, itemId: number, patch: Partial<WishlistItem>) {
    const res = await $fetch<{ success: boolean; data: WishlistItem }>(`/api/wishlists/${wishlistId}/items/${itemId}`, {
      method: 'PUT', body: patch,
    })
    const note = notes.value.find(n => n.id === wishlistId)
    if (note) {
      const idx = note.items.findIndex(i => i.id === itemId)
      if (idx !== -1) Object.assign(note.items[idx], res.data)
    }
  }

  async function deleteItem(wishlistId: number, itemId: number) {
    await $fetch(`/api/wishlists/${wishlistId}/items/${itemId}`, { method: 'DELETE' })
    const note = notes.value.find(n => n.id === wishlistId)
    if (note) note.items = note.items.filter(i => i.id !== itemId)
    selectedItemIds.value.delete(itemId)
  }

  async function toggleCheck(wishlistId: number, item: WishlistItem) {
    await updateItem(wishlistId, item.id, { is_checked: !item.is_checked })
  }

  function openTicketModal(noteId: number) {
    ticketSourceNoteId.value = noteId
    showTicketModal.value = true
  }

  function closeTicketModal() {
    showTicketModal.value = false
    isSelectMode.value = false
    selectedItemIds.value = new Set()
    ticketSourceNoteId.value = null
  }

  function toggleSelectMode(noteId?: number) {
    if (noteId !== undefined && ticketSourceNoteId.value !== noteId) {
      // switching to a different note's select mode
      selectedItemIds.value = new Set()
      ticketSourceNoteId.value = noteId
      isSelectMode.value = true
    } else {
      isSelectMode.value = !isSelectMode.value
      if (!isSelectMode.value) { selectedItemIds.value = new Set(); ticketSourceNoteId.value = null }
    }
  }

  function toggleItemSelect(itemId: number) {
    if (selectedItemIds.value.has(itemId)) {
      selectedItemIds.value.delete(itemId)
    } else {
      selectedItemIds.value.add(itemId)
    }
    selectedItemIds.value = new Set(selectedItemIds.value)
  }

  function selectAll(noteId: number) {
    const note = notes.value.find(n => n.id === noteId)
    if (!note) return
    selectedItemIds.value = new Set(note.items.map(i => i.id))
  }

  function deselectAll() {
    selectedItemIds.value = new Set()
  }

  return {
    notes, loading, focusedNoteId,
    pinnedNotes, totalUnchecked,
    isSelectMode, selectedItemIds, showTicketModal, ticketSourceNoteId,
    fetchNotes, createNote, updateNote, deleteNote,
    pinNote, unpinNote, savePinPosition, toggleMinimize,
    addItem, updateItem, deleteItem, toggleCheck,
    openTicketModal, closeTicketModal, toggleSelectMode, toggleItemSelect,
    selectAll, deselectAll,
  }
}, {
  persist: {
    key: 'wishlist',
    pick: ['focusedNoteId'],
  },
})

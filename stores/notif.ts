import { defineStore } from 'pinia'
import { useChatWidgetStore } from './chatWidget'

export const useNotifStore = defineStore('notif', () => {
  const items = ref<any[]>([])
  const unread = ref(0)
  const toasts = ref<any[]>([])
  // Sinyal reaktif: event SSE terakhir yang menyentuh sebuah ticket.
  // Dipakai halaman detail/list untuk refetch data otomatis.
  const lastTicketEvent = ref<{ ticketId: number; event: string; at: number } | null>(null)
  let es: EventSource | null = null

  function signalTicketEvent(event: string, data: any) {
    const ticketId = Number(data?.ticket_id ?? data?.id)
    if (!ticketId || Number.isNaN(ticketId)) return
    lastTicketEvent.value = { ticketId, event, at: Date.now() }
  }

  async function fetchNotifs() {
    const res = await $fetch('/api/notifications') as any
    items.value = res.data
    unread.value = res.unread
  }

  async function markRead(id?: number) {
    await $fetch('/api/notifications', { method: 'PUT', body: id ? { id } : { mark_all: true } })
    if (id) {
      const n = items.value.find(i => i.id === id)
      if (n) n.is_read = 1
      unread.value = Math.max(0, unread.value - 1)
    } else {
      items.value.forEach(i => i.is_read = 1)
      unread.value = 0
    }
  }

  function playSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const notes = [880, 1100, 1320]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.35)
      })
    } catch {}
  }

  function playChatSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      // Dua nada pendek "pop" khas chat
      const notes = [520, 660]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.2)
      })
    } catch {}
  }

  function addToast(notif: any) {
    const id = Date.now()
    toasts.value.push({ ...notif, _id: id })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t._id !== id)
    }, 5000)
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t._id !== id)
  }

  function connectSSE() {
    if (es) return
    es = new EventSource('/api/sse')

    es.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data)
      unread.value++
      items.value.unshift({ ...data, is_read: 0, created_at: new Date().toISOString() })
      addToast(data)
      playSound()
      if (data?.ticket_id) signalTicketEvent('notification', data)
    })

    // 'ticket_created' tidak lagi dibroadcast: assignee & participant sudah
    // menerima event 'notification' per user (ticket_assigned / ticket_invite).

    es.addEventListener('ticket_updated', (e) => {
      // payload dari /api/tickets/[id] memakai field `id`, dari external API `ticket_id`
      const data = JSON.parse(e.data)
      signalTicketEvent('ticket_updated', data)
    })

    es.addEventListener('ticket_message:new', (e) => {
      const data = JSON.parse(e.data)
      const auth = useAuthStore()
      if (data.sender_id === auth.user?.id) return

      const userId = auth.user?.id
      const chatWidget = useChatWidgetStore()
      chatWidget.pushIncoming(data)

      // Auto-tambah ke widget jika user adalah creator atau assignee ticket
      if (userId && (data.created_by === userId || data.assigned_to === userId)) {
        chatWidget.addTicketMinimized({
          ticketId: data.ticket_id,
          ticketNumber: data.ticket_number,
          title: data.ticket_title,
        })
      }

      const openTicket = chatWidget.openTickets.find((t: any) => t.ticketId === data.ticket_id)
      if (openTicket?.mode !== 'expanded') {
        chatWidget.incrementUnread(data.ticket_id)
        playChatSound()
      }

      signalTicketEvent('ticket_message:new', data)
    })

    es.addEventListener('ticket_response', (e) => {
      const data = JSON.parse(e.data)

      const auth = useAuthStore()
      const userId = auth.user?.id
      const role = auth.user?.role
      if (!userId || data.sender_id === userId) return
      if (data.is_internal && role === 'customer') return

      const isRelevant = role === 'customer'
        ? (data.created_by === userId || data.assigned_to === userId)
        : (role === 'staff' || role === 'admin')
      if (isRelevant) {
        addToast({ title: 'Response baru', message: `Ticket ${data.ticket_number} dibalas`, type: 'new_response', ticket_id: data.ticket_id })
        const ticketUnread = useTicketUnreadStore()
        ticketUnread.markUnread(data.ticket_id)
      }

      signalTicketEvent('ticket_response', data)
    })

    es.onerror = () => {
      es?.close()
      es = null
      setTimeout(connectSSE, 5000)
    }
  }

  function disconnectSSE() {
    es?.close()
    es = null
  }

  return { items, unread, toasts, lastTicketEvent, fetchNotifs, markRead, connectSSE, disconnectSSE, playSound, playChatSound, dismissToast }
})

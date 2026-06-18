import { defineStore } from 'pinia'

export const useNotifStore = defineStore('notif', () => {
  const items = ref<any[]>([])
  const unread = ref(0)
  const toasts = ref<any[]>([])
  let es: EventSource | null = null

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
    })

    es.addEventListener('ticket_created', (e) => {
      const data = JSON.parse(e.data)
      const auth = useAuthStore()
      const role = auth.user?.role
      // Hanya tampilkan ke staff dan admin, skip jika creator adalah user sendiri
      if (role !== 'staff' && role !== 'admin') return
      if (data.created_by === auth.user?.id) return
      addToast({ title: 'Ticket baru', message: `${data.ticket_number}: ${data.title}`, type: 'ticket_created', ticket_id: data.id })
      playSound()
      unread.value++
      items.value.unshift({
        title: 'Ticket baru dibuat',
        message: `${data.ticket_number}: ${data.title}`,
        type: 'ticket_created',
        ticket_id: data.id,
        is_read: 0,
        created_at: new Date().toISOString(),
      })
    })

    es.addEventListener('ticket_updated', () => {})

    es.addEventListener('ticket_response', (e) => {
      const data = JSON.parse(e.data)
      addToast({ title: 'Response baru', message: `Ticket ${data.ticket_number} dibalas`, type: 'new_response', ticket_id: data.ticket_id })
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

  return { items, unread, toasts, fetchNotifs, markRead, connectSSE, disconnectSSE, playSound, dismissToast }
})

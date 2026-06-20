import { defineStore } from 'pinia'
import { useChatWidgetStore } from './chatWidget'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const loading = ref(false)

  async function loadActiveChatTickets(playSound = false) {
    try {
      const chatWidget = useChatWidgetStore()
      const res = await $fetch('/api/tickets/chat-active') as any
      const tickets = (res.data || []) as any[]
      let hasNew = false
      for (const t of tickets) {
        const existing = chatWidget.openTickets.find((ot: any) => ot.ticketId === t.ticketId)
        if (!existing) {
          chatWidget.addTicketMinimized(t)
          hasNew = true
        }
      }
      if (playSound && hasNew) {
        const notif = useNotifStore()
        notif.playChatSound()
      }
    } catch {}
  }

  async function fetchMe(headers?: Record<string, string>) {
    try {
      const res = await $fetch('/api/auth/me', { headers })
      user.value = (res as any).user
      if (user.value?.id) {
        const chatWidget = useChatWidgetStore()
        chatWidget.initForUser(user.value.id)
        await loadActiveChatTickets(false)
      }
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const res = await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
      user.value = (res as any).user
      if (user.value?.id) {
        const chatWidget = useChatWidgetStore()
        chatWidget.initForUser(user.value.id)
        await loadActiveChatTickets(true)
      }
      return true
    } catch (e: any) {
      throw new Error(e?.data?.statusMessage || 'Login gagal')
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    const chatWidget = useChatWidgetStore()
    chatWidget.clearAll()
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    navigateTo('/login')
  }

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')
  const isCustomer = computed(() => user.value?.role === 'customer')
  const isStaffOrAdmin = computed(() => ['admin', 'staff'].includes(user.value?.role))

  return { user, loading, fetchMe, login, logout, isAdmin, isStaff, isCustomer, isStaffOrAdmin }
})

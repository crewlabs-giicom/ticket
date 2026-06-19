import { defineStore } from 'pinia'
import { useChatWidgetStore } from './chatWidget'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const loading = ref(false)

  async function fetchMe() {
    try {
      const res = await $fetch('/api/auth/me')
      user.value = (res as any).user
      if (user.value?.id) {
        const chatWidget = useChatWidgetStore()
        chatWidget.initForUser(user.value.id)
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

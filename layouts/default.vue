<template>
  <div class="min-h-screen flex bg-slate-50">
    <!-- Sidebar overlay mobile -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-30 lg:hidden" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside :class="['fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full']">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 h-16 border-b border-slate-200 flex-shrink-0">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <span class="font-semibold text-slate-900 text-sm">TicketingApp</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-0.5">
        <NuxtLink v-for="m in menus" :key="m.id" :to="m.path" class="nav-link" :class="{ active: isActive(m.path) }" @click="sidebarOpen = false">
          <component :is="getIcon(m.icon)" class="w-4 h-4 flex-shrink-0" />
          <span>{{ m.name }}</span>
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="p-3 border-t border-slate-200">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">{{ initials }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-900 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-slate-500 capitalize">{{ auth.user?.role }}</p>
          </div>
          <button @click="auth.logout()" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col lg:ml-64">
      <!-- Navbar -->
      <header class="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
        <button class="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" @click="sidebarOpen = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="flex-1">
          <h1 class="text-sm font-semibold text-slate-900">{{ pageTitle }}</h1>
        </div>
        <!-- Notif Bell -->
        <div class="relative" ref="notifRef">
          <button @click="notifOpen = !notifOpen" class="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span v-if="notif.unread > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{{ notif.unread > 9 ? '9+' : notif.unread }}</span>
          </button>
          <!-- Notif panel -->
          <div v-if="notifOpen" class="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span class="font-semibold text-sm text-slate-900">Notifikasi</span>
              <button @click="notif.markRead(); notifOpen=false" class="text-xs text-primary-600 hover:underline">Tandai semua dibaca</button>
            </div>
            <div class="max-h-80 overflow-y-auto divide-y divide-slate-50">
              <div v-if="!notif.items.length" class="p-4 text-center text-sm text-slate-400">Tidak ada notifikasi</div>
              <div v-for="n in notif.items.slice(0,20)" :key="n.id" @click="notif.markRead(n.id); notifOpen=false" :class="['px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors', !n.is_read && 'bg-primary-50']">
                <p class="text-sm font-medium text-slate-900">{{ n.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ n.message }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ timeAgo(n.created_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Tab bar -->
      <div v-if="tabs.tabs.length" class="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        <span class="text-xs text-slate-400 mr-1 flex-shrink-0">Tab:</span>
        <div v-for="tab in tabs.tabs" :key="tab.id" :class="['tab-item group', tab.id === tabs.activeTabId && 'active']" @click="tabs.openTab(tab)">
          <span v-if="tab.hasUnread" class="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
          <span class="max-w-[120px] truncate">{{ tab.ticket_number }}</span>
          <button v-if="!tab.pinned" @click.stop="tabs.closeTab(tab.id)" class="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-slate-200 transition-all">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <svg v-else class="w-3 h-3 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
        </div>
      </div>

      <!-- Page content -->
      <main class="flex-1 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
const auth = useAuthStore()
const notif = useNotifStore()
const tabs = useTabStore()
const route = useRoute()
const sidebarOpen = ref(false)
const notifOpen = ref(false)
const notifRef = ref(null)

onClickOutside(notifRef, () => { notifOpen.value = false })

const menus = ref<any[]>([])

function fallbackMenus(role?: string) {
  const base = [
    { id: 'f1', name: 'Dashboard', path: '/', icon: 'dashboard' },
    { id: 'f2', name: 'Tickets', path: '/tickets', icon: 'ticket' },
    { id: 'f3', name: 'Kalender', path: '/calendar', icon: 'calendar' }
  ]
  if (role === 'admin') {
    return [
      ...base,
      { id: 'f4', name: 'Reports', path: '/reports', icon: 'chart-bar' },
      { id: 'f5', name: 'Users', path: '/master/users', icon: 'users' },
      { id: 'f6', name: 'Projects', path: '/master/projects', icon: 'folder' },
      { id: 'f7', name: 'Priority', path: '/master/priorities', icon: 'flag' },
      { id: 'f8', name: 'Status', path: '/master/statuses', icon: 'tag' },
      { id: 'f9', name: 'Menus', path: '/master/menus', icon: 'menu' }
    ]
  }
  return base
}

async function loadMenus() {
  try {
    const res = await $fetch('/api/menus')
    const rows = (res as any)?.data || []
    menus.value = rows.length ? rows : fallbackMenus(auth.user?.role)
  } catch {
    menus.value = fallbackMenus(auth.user?.role)
  }
}

watch(() => auth.user?.role, () => {
  loadMenus()
}, { immediate: true })

const pageTitle = computed(() => {
  const titles: Record<string, string> = { '/': 'Dashboard', '/tickets': 'Tickets', '/calendar': 'Kalender', '/reports': 'Reports', '/master/users': 'Master User', '/master/projects': 'Master Project', '/master/priorities': 'Master Priority', '/master/statuses': 'Master Status', '/master/menus': 'Master Menu' }
  return titles[route.path] || 'TicketingApp'
})

const initials = computed(() => auth.user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U')

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function getIcon(name: string) {
  const icons: Record<string, any> = {
    dashboard: resolveComponent('IconDashboard'),
    ticket: resolveComponent('IconTicket'),
    calendar: resolveComponent('IconCalendar'),
    'chart-bar': resolveComponent('IconChart'),
    users: resolveComponent('IconUsers'),
    folder: resolveComponent('IconFolder'),
    flag: resolveComponent('IconFlag'),
    tag: resolveComponent('IconTag'),
    menu: resolveComponent('IconMenu'),
  }
  return icons[name] || resolveComponent('IconDashboard')
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j lalu`
  return `${Math.floor(h / 24)}h lalu`
}

onMounted(async () => {
  await notif.fetchNotifs()
  notif.connectSSE()
})
onUnmounted(() => notif.disconnectSSE())
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <ClientOnly><AppLightbox /></ClientOnly>
    <!-- Sidebar overlay mobile -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-30 lg:hidden" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <!-- Mobile: selalu w-64 (sidebarCollapsed hanya berlaku di desktop lg+) -->
    <aside id="nav-sidebar" :class="['fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 flex flex-col transition-all duration-200 lg:translate-x-0 w-64', sidebarOpen ? 'translate-x-0' : '-translate-x-full', sidebarCollapsed ? 'lg:w-16' : '']">
      <!-- Logo + collapse toggle -->
      <div class="h-16 border-b border-slate-200 flex-shrink-0 flex items-center justify-between px-3">
        <AppLogo v-show="!sidebarCollapsed || sidebarOpen" />
        <button @click="sidebarCollapsed = !sidebarCollapsed" class="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" :title="sidebarCollapsed ? 'Perluas sidebar' : 'Sembunyikan sidebar'">
          <svg class="w-4 h-4 transition-transform duration-200" :class="sidebarCollapsed ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto p-2 space-y-3">
        <div v-for="group in menuGroups" :key="group.label">
          <p v-show="!sidebarCollapsed || sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 mb-1">{{ group.label }}</p>
          <div class="space-y-0.5">
            <NuxtLink v-for="m in group.items" :key="m.id" :id="navLinkId(m.path)" :to="m.path" class="nav-link" :class="[{ active: isActive(m.path) }, (sidebarCollapsed && !sidebarOpen) ? 'lg:justify-center lg:px-2' : '']" @click="sidebarOpen = false" :title="(sidebarCollapsed && !sidebarOpen) ? m.name : undefined">
              <component :is="getIcon(m.icon)" class="w-4 h-4 flex-shrink-0" />
              <span v-show="!sidebarCollapsed || sidebarOpen">{{ m.name }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- User -->
      <div class="p-2 border-t border-slate-200">
        <div class="flex items-center gap-2 px-1 py-2">
          <NuxtLink id="sidebar-user-profile" to="/profile" class="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity" @click="sidebarOpen = false" :title="(sidebarCollapsed && !sidebarOpen) ? auth.user?.name : undefined">
            <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0 overflow-hidden">
              <img v-if="auth.user?.avatar" :src="`/uploads/${auth.user.avatar}`" class="w-full h-full object-cover" />
              <span v-else>{{ initials }}</span>
            </div>
            <div v-show="!sidebarCollapsed || sidebarOpen" class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-900 truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-slate-500 capitalize">{{ auth.user?.role }}</p>
            </div>
          </NuxtLink>
          <button v-show="!sidebarCollapsed || sidebarOpen" @click="auth.logout()" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0" title="Logout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
        <div v-show="!sidebarCollapsed || sidebarOpen" class="flex items-center gap-1.5 px-1 pb-1">
          <NuxtLink id="sidebar-help-btn" to="/help" class="flex-1 flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 px-2 py-1.5 rounded-lg transition-colors" @click="sidebarOpen = false">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Panduan & FAQ
          </NuxtLink>
          <button @click="startTour(true)" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Ulangi Tour">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div :class="['flex-1 flex flex-col transition-all duration-200', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64']">
      <!-- Navbar -->
      <header class="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
        <button class="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" @click="sidebarOpen = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="flex-1">
          <h1 class="text-sm font-semibold text-slate-900">{{ pageTitle }}</h1>
        </div>
        <!-- Notif Bell -->
        <!-- Sync indicator -->
        <div v-if="pendingCount > 0" class="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          {{ pendingCount }} pending
          <button @click="retrySync" class="underline hover:no-underline ml-0.5">Retry</button>
          <span class="text-amber-300">·</span>
          <button @click="clearQueue" class="underline hover:no-underline text-amber-500">Clear</button>
        </div>
        <!-- Wishlist shortcut in header -->
        <NuxtLink
          to="/wishlist"
          class="relative p-2 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors"
          title="Catatan"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2
                 M9 12h6M9 16h4" />
          </svg>
          <span
            v-if="wishlist.totalUnchecked > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
          >{{ wishlist.totalUnchecked > 9 ? '9+' : wishlist.totalUnchecked }}</span>
        </NuxtLink>
        <div class="relative" ref="notifRef">
          <button @click="notifOpen = !notifOpen" class="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span v-if="notif.unread > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{{ notif.unread > 9 ? '9+' : notif.unread }}</span>
          </button>
          <!-- Notif panel -->
          <div v-if="notifOpen" class="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span class="font-semibold text-sm text-slate-900">Notifikasi</span>
              <button @click="notif.markRead(); notifOpen=false" class="text-xs text-primary-600 hover:underline">Tandai semua dibaca</button>
            </div>
            <div class="max-h-80 overflow-y-auto divide-y divide-slate-50">
              <div v-if="!notif.items.length" class="p-4 text-center text-sm text-slate-400">Tidak ada notifikasi</div>
              <div v-for="n in notif.items.slice(0,20)" :key="n.id" @click="handleNotifClick(n)" :class="['px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors', !n.is_read && 'bg-primary-50']">
                <p class="text-sm font-medium text-slate-900">{{ n.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ n.message }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ timeAgo(n.created_at) }}</p>
              </div>
            </div>
            <div class="px-4 py-2.5 border-t border-slate-100 text-center">
              <NuxtLink to="/notifications" @click="notifOpen = false" class="text-xs text-primary-600 hover:underline">
                Lihat semua notifikasi
              </NuxtLink>
            </div>
          </div>
        </div>
      </header>

      <!-- Row 1: Page Tabs -->
      <div v-if="tabs.pageTabs.length" class="sticky top-16 z-10 bg-slate-50 border-b border-slate-200 px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
        <span class="text-[10px] text-slate-400 mr-2 flex-shrink-0 font-medium uppercase tracking-wider">Halaman</span>
        <div v-for="pt in tabs.pageTabs" :key="pt.path" :class="['page-tab-item group', route.path === pt.path && 'active']" @click="navigateTo(pt.path)">
          <component :is="getIcon(pt.icon)" class="w-3 h-3 flex-shrink-0" />
          <span class="max-w-[100px] truncate">{{ pt.label }}</span>
          <!-- Pin toggle: always visible on mobile, hover-only on desktop -->
          <button v-if="!pt.pinned" @click.stop="tabs.togglePagePin(pt.path)" class="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-slate-300 transition-all" title="Pin halaman ini">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          </button>
          <button v-else @click.stop="tabs.togglePagePin(pt.path)" class="ml-0.5 p-0.5 rounded hover:bg-slate-300 transition-all" title="Unpin">
            <svg class="w-3 h-3 text-primary-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          </button>
          <!-- Close (hanya jika tidak pinned): always visible on mobile -->
          <button v-if="!pt.pinned" @click.stop="tabs.closePageTab(pt.path)" class="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-slate-300 transition-all">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Row 2: Ticket Tabs -->
      <div v-if="tabs.tabs.length" class="sticky z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto" :style="{ top: tabs.pageTabs.length ? '6rem' : '4rem' }">
        <span class="text-xs text-slate-400 mr-1 flex-shrink-0">Ticket</span>
        <div v-for="tab in tabs.tabs" :key="tab.id" :class="['tab-item group', tab.id === tabs.activeTabId && 'active']" @click="tabs.openTab(tab)">
          <span v-if="tab.hasUnread" class="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
          <span class="max-w-[120px] truncate">{{ tab.ticket_number || tab.title }}</span>
          <button v-if="!tab.pinned" @click.stop="tabs.closeTab(tab.id)" class="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-slate-200 transition-all">
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
import { resolveComponent, computed } from 'vue'
const auth = useAuthStore()
const notif = useNotifStore()
const tabs = useTabStore()
const wishlist = useWishlistStore()
const route = useRoute()
const router = useRouter()

const sidebarOpen = ref(false)
const sidebarCollapsedCookie = useCookie<boolean>('sidebar-collapsed', { default: () => false })
const sidebarCollapsed = ref(sidebarCollapsedCookie.value)
watch(sidebarCollapsed, v => { sidebarCollapsedCookie.value = v })
const notifOpen = ref(false)
const notifRef = ref(null)

const { pendingCount, setupListeners, retrySync, clearQueue } = useSync()


onClickOutside(notifRef, () => { notifOpen.value = false })

function handleNotifClick(n: any) {
  notif.markRead(n.id)
  notifOpen.value = false
  if (n.ticket_id) {
    tabs.openTab({ id: n.ticket_id, ticket_number: '', title: n.title })
  } else if (n.task_id) {
    router.push(`/tasks?open=${n.task_id}`)
  }
}

const menus = ref<any[]>([])

function menuSection(path: string): string {
  if (path.startsWith('/master/')) return 'Master Data'
  if (path === '/workload' || path.startsWith('/reports')) return 'Management'
  return 'Menu'
}

const menuGroups = computed(() => {
  const groups: Record<string, { label: string; order: number; items: any[] }> = {
    'Menu':        { label: 'Menu',        order: 0, items: [] },
    'Management':  { label: 'Management',  order: 1, items: [] },
    'Master Data': { label: 'Master Data', order: 2, items: [] },
  }
  for (const m of menus.value) {
    const section = m.section || menuSection(m.path)
    if (!groups[section]) groups[section] = { label: section, order: 99, items: [] }
    groups[section].items.push(m)
  }
  return Object.values(groups).filter(g => g.items.length).sort((a, b) => a.order - b.order)
})

function fallbackMenus(role?: string) {
  const base = [
    { id: 'f1', name: 'Dashboard', path: '/', icon: 'dashboard' },
    { id: 'f2', name: 'Projects', path: '/projects', icon: 'folder' },
    { id: 'f3', name: 'Tasks', path: '/tasks', icon: 'check-square' },
    { id: 'f4', name: 'Tickets', path: '/tickets', icon: 'ticket' },
    { id: 'f4n', name: 'Notifikasi', path: '/notifications', icon: 'bell' },
    { id: 'f5', name: 'Kalender', path: '/calendar', icon: 'calendar' },
    { id: 'f-wishlist', name: 'Catatan', path: '/wishlist', icon: 'clipboard' },
  ]
  if (role === 'admin') {
    return [
      ...base,
      { id: 'f6', name: 'Workload', path: '/workload', icon: 'users' },
      { id: 'f7', name: 'Recapitulation', path: '/reports', icon: 'chart-bar' },
      { id: 'f7b', name: 'Report Ticket', path: '/reports/tickets', icon: 'chart-bar' },
      { id: 'f7c', name: 'Report Task', path: '/reports/tasks', icon: 'chart-bar' },
      { id: 'f7d', name: 'Daily Report', path: '/reports/daily', icon: 'chart-bar' },
      { id: 'f8', name: 'Users', path: '/master/users', icon: 'users' },
      { id: 'f9', name: 'Master Projects', path: '/master/projects', icon: 'folder' },
      { id: 'f10', name: 'Priority', path: '/master/priorities', icon: 'flag' },
      { id: 'f11', name: 'Status', path: '/master/statuses', icon: 'tag' },
      { id: 'f12', name: 'Menus', path: '/master/menus', icon: 'menu' },
      { id: 'f13', name: 'Menu Sistem', path: '/master/system-menus', icon: 'grid' }
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

const dynamicTitle = useState<string | null>('page-title', () => null)
watch(() => route.path, () => { dynamicTitle.value = null })

const pageTitle = computed(() => {
  if (dynamicTitle.value) return dynamicTitle.value
  const titles: Record<string, string> = {
    '/': 'Dashboard', '/tickets': 'Tickets', '/tasks': 'Tasks', '/projects': 'Projects',
    '/workload': 'Workload', '/calendar': 'Kalender', '/reports': 'Recapitulation', '/reports/tickets': 'Report Ticket', '/reports/tasks': 'Report Task', '/reports/daily': 'Daily Report',
    '/master/users': 'Master User', '/master/projects': 'Master Project',
    '/master/priorities': 'Master Priority', '/master/statuses': 'Master Status', '/master/menus': 'Master Menu',
    '/notifications': 'Notifikasi', '/profile': 'Profil Saya', '/wishlist': 'Catatan',
  }
  if (titles[route.path]) return titles[route.path]
  const parts = route.path.split('/').filter(Boolean)
  return parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' › ')
})

const initials = computed(() => auth.user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U')

const currentPageIcon = computed(() => {
  const all = menuGroups.value.flatMap((g: any) => g.items) as any[]
  return all.find((m: any) => m.path === route.path)?.icon || 'grid'
})

const PAGE_TAB_EXCLUDE = /^\/tickets\/\d+|^\/login|^\/profile/
watch(() => route.path, (path) => {
  if (PAGE_TAB_EXCLUDE.test(path)) return
  tabs.openPageTab({ path, label: pageTitle.value, icon: currentPageIcon.value })
}, { immediate: true })

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
    bell: resolveComponent('IconBell'),
    'check-square': resolveComponent('IconTicket'), // reuse ticket icon for tasks
    clipboard: resolveComponent('IconClipboard'),
  }
  return icons[name] || resolveComponent('IconDashboard')
}

const { timeAgo } = useTimeAgo()
const { startTour } = useTour()

function navLinkId(path: string) {
  const map: Record<string, string> = {
    '/': 'nav-link-dashboard',
    '/tickets': 'nav-link-tickets',
    '/tasks': 'nav-link-tasks',
    '/projects': 'nav-link-projects',
    '/calendar': 'nav-link-calendar',
    '/reports': 'nav-link-reports',
    '/workload': 'nav-link-workload',
    '/wishlist': 'sidebar-catatan',
  }
  return map[path] || undefined
}

onMounted(async () => {
  await notif.fetchNotifs()
  notif.connectSSE()
  setupListeners()
  // Restore pinned tabs dari DB agar konsisten antar device/user
  if (auth.user) {
    await tabs.loadPinnedTabs()
    await tabs.loadPinnedPageTabs()
    wishlist.fetchNotes()
  }
})
onUnmounted(() => notif.disconnectSSE())
</script>

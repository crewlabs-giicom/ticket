<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <input v-model="search" class="input w-64" placeholder="Cari notifikasi..." />
      </div>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="loading" @click="fetchNotifs" />
        <button @click="markAllRead" class="btn-secondary text-sm">Tandai semua dibaca</button>
      </div>
    </div>

    <!-- List -->
    <div class="card overflow-hidden divide-y divide-slate-100">
      <div v-if="loading" class="py-10 text-center text-slate-400 text-sm">Memuat...</div>
      <div v-else-if="!items.length" class="py-10 text-center text-slate-400 text-sm">Tidak ada notifikasi</div>
      <div
        v-for="n in items"
        :key="n.id"
        @click="handleClick(n)"
        :class="['flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors', !n.is_read && 'bg-primary-50']"
      >
        <!-- Unread dot -->
        <span class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" :class="n.is_read ? 'bg-transparent' : 'bg-primary-500'" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900">{{ n.title }}</p>
          <p class="text-xs text-slate-500 mt-0.5">{{ n.message }}</p>
        </div>
        <div class="flex-shrink-0 text-right">
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{{ n.type }}</span>
          <p class="text-xs text-slate-400 mt-1">{{ fmtDatetime(n.created_at) }}</p>
        </div>
      </div>
    </div>

    <AppPagination
      :page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      :limit="pagination.limit"
      @page-change="onPageChange"
      @limit-change="onLimitChange"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const tabs = useTabStore()
const notif = useNotifStore()
const router = useRouter()
const { fmtDate } = useDate()

function fmtDatetime(val: string) {
  if (!val) return '—'
  const d = new Date(val)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const search = ref('')
const loading = ref(false)
const items = ref<any[]>([])
const pagination = reactive({ page: 1, totalPages: 1, total: 0, limit: 20 })

async function fetchNotifs() {
  loading.value = true
  try {
    const q: Record<string, any> = { full: 1, page: pagination.page, limit: pagination.limit }
    if (search.value) q.search = search.value
    const res = await $fetch('/api/notifications', { query: q }) as any
    items.value = res.data
    pagination.total = res.total ?? 0
    pagination.totalPages = res.totalPages ?? 1
    pagination.page = res.page ?? 1
  } finally { loading.value = false }
}

function onPageChange(p: number) { pagination.page = p; fetchNotifs() }
function onLimitChange(l: number) { pagination.limit = l; pagination.page = 1; fetchNotifs() }

watchDebounced(search, () => { pagination.page = 1; fetchNotifs() }, { debounce: 300, maxWait: 1000 })

onMounted(fetchNotifs)

function handleClick(n: any) {
  notif.markRead(n.id)
  n.is_read = 1
  if (n.ticket_id) {
    tabs.openTab({ id: n.ticket_id, ticket_number: '', title: n.title })
  } else if (n.task_id) {
    router.push(`/tasks?open=${n.task_id}`)
  }
}

async function markAllRead() {
  await notif.markRead()
  items.value.forEach(i => i.is_read = 1)
}
</script>

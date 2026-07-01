<template>
  <div v-if="form" class="max-w-4xl mx-auto space-y-4">
    <!-- Header -->
    <div class="card p-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold">QC Form #{{ form.sequence }}</span>
            <span :class="['badge text-xs', form.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
              {{ form.status === 'completed' ? 'Selesai' : 'Aktif' }}
            </span>
          </div>
          <h1 class="text-lg font-bold text-slate-900">{{ form.task_title }}</h1>
          <p class="text-xs text-slate-400 mt-0.5">Template: {{ form.template_name || 'Tanpa template' }} · Dibuat oleh {{ form.created_by_name }}</p>
        </div>
        <AppRefreshButton :loading="loading" @click="fetchForm" />
      </div>

      <!-- Checker progress -->
      <div class="mt-4 flex flex-wrap gap-2">
        <div v-for="c in form.checkers" :key="c.user_id"
          :class="['flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs', c.is_done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600']">
          <div class="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold overflow-hidden flex-shrink-0">
            <img v-if="c.avatar" :src="`/uploads/${c.avatar}`" class="w-full h-full object-cover" />
            <span v-else>{{ c.name?.charAt(0) }}</span>
          </div>
          <span class="font-medium">{{ c.name }}</span>
          <span v-if="c.is_done" class="text-green-600 font-bold">✓</span>
          <span v-else class="text-slate-400">—</span>
        </div>
      </div>
    </div>

    <!-- Task Info Card -->
    <div class="card p-4">
      <button class="flex items-center justify-between w-full" @click="showTaskInfo = !showTaskInfo">
        <span class="text-sm font-semibold text-slate-700">Info Task</span>
        <svg :class="['w-4 h-4 text-slate-400 transition-transform', showTaskInfo ? '' : '-rotate-90']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <div v-if="showTaskInfo" class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p class="text-xs text-slate-400 mb-0.5">Project</p>
          <p class="text-slate-700 font-medium">{{ form.project_name || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-slate-400 mb-0.5">Status Task</p>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{{ form.task_status }}</span>
        </div>
        <div>
          <p class="text-xs text-slate-400 mb-0.5">Assignee</p>
          <p class="text-slate-700">{{ form.task_assignee_name || '—' }}</p>
        </div>
        <div v-if="form.task_description" class="col-span-2">
          <p class="text-xs text-slate-400 mb-0.5">Deskripsi</p>
          <p class="text-slate-600 whitespace-pre-wrap text-xs leading-relaxed">{{ form.task_description }}</p>
        </div>
      </div>
    </div>

    <!-- Time Tracker (only visible to checkers + staff/admin) -->
    <div v-if="isChecker" class="card p-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-700">Time Tracker QC</h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Total saya: <span class="font-medium text-slate-600">{{ timer.totalFormatted.value }}</span>
            <span v-if="myTotalSeconds > 0 && timer.totalSeconds.value !== myTotalSeconds" class="ml-2">
              · Semua checker: <span class="font-medium text-slate-600">{{ formatSeconds(allTotalSeconds) }}</span>
            </span>
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <!-- Running -->
          <template v-if="timer.isRunning.value">
            <span class="text-xs text-slate-500 flex items-center gap-1">
              <span class="w-2 h-2 rounded-sm bg-emerald-500 animate-pulse"></span>
              {{ timer.elapsedFormatted.value }}
            </span>
            <button @click="timer.pause()"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              Jeda
            </button>
            <button @click="timer.stop()"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              Stop
            </button>
          </template>
          <!-- Paused -->
          <template v-else-if="timer.isPaused.value">
            <button @click="timer.resume()"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Lanjutkan
            </button>
            <button @click="timer.stop()"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              Stop
            </button>
          </template>
          <!-- Idle -->
          <template v-else>
            <button @click="timer.start()" :disabled="form?.status === 'completed'"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Mulai QC Timer
            </button>
          </template>
        </div>
      </div>
      <!-- Log history (current user only) -->
      <div v-if="timer.timelogs.value.filter((l: any) => l.user_id === auth.user?.id).length" class="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
        <div v-for="log in timer.timelogs.value.filter((l: any) => l.user_id === auth.user?.id)" :key="log.id"
          class="flex items-center justify-between text-xs text-slate-500">
          <span>{{ log.duration_seconds ? timer.formatSeconds(log.duration_seconds) : '⏱ jalan...' }}</span>
          <span class="text-slate-300">{{ log.started_at?.slice(11, 16) }} – {{ log.stopped_at?.slice(11, 16) || '...' }}</span>
        </div>
      </div>
    </div>

    <!-- Add manual item (staff only) -->
    <div v-if="auth.isStaffOrAdmin && form.status === 'active'" class="card p-4">
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Tambah Item Checklist Manual</h3>
      <div class="flex gap-2">
        <input v-model="newItemName" class="input flex-1 text-sm" placeholder="Nama item..." @keydown.enter.prevent="addManualItem" />
        <div class="flex flex-col gap-1">
          <label class="text-[10px] text-slate-400 uppercase font-semibold">Untuk checker</label>
          <div class="flex flex-wrap gap-1">
            <label v-for="c in form.checkers" :key="c.user_id" class="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" :value="c.user_id" v-model="newItemCheckerIds" class="accent-indigo-600" />
              {{ c.name }}
            </label>
          </div>
        </div>
        <button @click="addManualItem" :disabled="!newItemName.trim() || !newItemCheckerIds.length"
          class="btn-primary text-sm self-end">Tambah</button>
      </div>
    </div>

    <!-- Checklist items per checker -->
    <div v-for="checker in form.checkers" :key="checker.user_id" class="card overflow-hidden">
      <div class="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold overflow-hidden">
            <img v-if="checker.avatar" :src="`/uploads/${checker.avatar}`" class="w-full h-full object-cover" />
            <span v-else>{{ checker.name?.charAt(0) }}</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-800">{{ checker.name }}</p>
            <p class="text-[10px] text-slate-400">{{ checkerItems(checker.user_id).filter((i: any) => i.is_checked).length }}/{{ checkerItems(checker.user_id).length }} item selesai</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="checker.is_done" class="badge bg-green-100 text-green-700 text-xs">Done Check ✓</span>
          <button
            v-else-if="canMarkDone(checker)"
            @click="markDone(checker)"
            :disabled="markingDone === checker.user_id"
            class="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >Done Check</button>
        </div>
      </div>

      <div class="divide-y divide-slate-100">
        <div v-for="item in checkerItems(checker.user_id)" :key="item.id"
          class="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
          <input type="checkbox" :checked="item.is_checked"
            :disabled="!canCheck(checker) || form.status === 'completed'"
            @change="toggleItem(item)"
            class="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed" />
          <div class="flex-1 min-w-0">
            <p :class="['text-sm', item.is_checked ? 'line-through text-slate-400' : 'text-slate-800']">{{ item.item_name }}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span v-if="item.source === 'manual'" class="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">manual</span>
              <NuxtLink v-for="tk in item.tickets" :key="tk.id" :to="`/tickets/${tk.id}`"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors"
                :class="tk.is_resolved ? 'bg-green-50 border-green-200 text-green-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'">
                {{ tk.ticket_number }}
                <span v-if="tk.is_resolved">✓</span>
              </NuxtLink>
            </div>
          </div>
          <!-- Open ticket button -->
          <button
            v-if="canCheck(checker) && form.status === 'active'"
            @click="openTicketModal(item, checker)"
            class="flex-shrink-0 text-[10px] border border-indigo-200 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >+ Buka Ticket</button>
        </div>
        <p v-if="!checkerItems(checker.user_id).length" class="px-5 py-4 text-sm text-slate-400">Belum ada item checklist.</p>
      </div>
    </div>

    <!-- Open Ticket Modal -->
    <div v-if="ticketModal.show" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-1">Buka Ticket dari Checklist</h3>
        <p class="text-xs text-slate-400 mb-4">Item: {{ ticketModal.item?.item_name }}</p>
        <div class="space-y-3">
          <div>
            <label class="label">Judul Ticket</label>
            <input v-model="ticketModal.title" class="input text-sm" :placeholder="`[QC] ${ticketModal.item?.item_name}`" />
          </div>
          <div>
            <label class="label">Priority <span class="text-red-500">*</span></label>
            <AppSelect v-model="ticketModal.priority_id"
              :options="priorities.map((p: any) => ({ value: p.id, label: p.name }))"
              placeholder="Pilih priority" />
          </div>
          <div>
            <label class="label">Deskripsi</label>
            <textarea v-model="ticketModal.description" class="input text-sm" rows="3" placeholder="Opsional"></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="ticketModal.show = false" class="btn-secondary flex-1">Batal</button>
          <button @click="submitOpenTicket" :disabled="ticketModal.loading || !ticketModal.priority_id" class="btn-primary flex-1">
            {{ ticketModal.loading ? 'Membuat...' : 'Buka Ticket' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="text-center py-16 text-slate-400">Memuat QC Form...</div>
  <div v-else class="text-center py-16 text-slate-400">QC Form tidak ditemukan.</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const auth = useAuthStore()
const id = Number(route.params.id)
const qcFormIdRef = computed(() => id)
const timer = useQcTimer(qcFormIdRef)

const form = ref<any>(null)
const loading = ref(false)
const showTaskInfo = ref(true)
const markingDone = ref<number | null>(null)
const newItemName = ref('')
const newItemCheckerIds = ref<number[]>([])

const { data: pd } = await useFetch('/api/priorities')
const priorities = computed(() => (pd.value as any)?.data || [])

// Timer helpers
function formatSeconds(s: number) {
  if (!s || s < 0) return '0s'
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60
  if (h > 0) return `${h}j ${m}m`; if (m > 0) return `${m}m ${sec}s`; return `${sec}s`
}
const myTotalSeconds = computed(() =>
  timer.timelogs.value.filter((l: any) => l.user_id === auth.user?.id)
    .reduce((s: number, l: any) => s + Number(l.duration_seconds || 0), 0)
)
const allTotalSeconds = computed(() =>
  timer.timelogs.value.reduce((s: number, l: any) => s + Number(l.duration_seconds || 0), 0)
)

// Whether current user is a checker on this form
const isChecker = computed(() => {
  if (auth.isStaffOrAdmin) return true
  return (form.value?.checkers || []).some((c: any) => c.user_id === auth.user?.id)
})

async function fetchForm() {
  loading.value = true
  try {
    form.value = await $fetch<any>(`/api/qc-forms/${id}`)
  } catch {
    form.value = null
  } finally {
    loading.value = false
  }
}

function checkerItems(checkerId: number) {
  return (form.value?.items || []).filter((i: any) => i.checker_id === checkerId)
}

function canCheck(checker: any) {
  // User can check if they are the checker or staff/admin
  if (auth.isStaffOrAdmin) return true
  return auth.user?.id === checker.user_id
}

function canMarkDone(checker: any) {
  if (form.value?.status === 'completed') return false
  if (!canCheck(checker)) return false
  const items = checkerItems(checker.user_id)
  return items.length > 0 && items.every((i: any) => i.is_checked)
}

async function toggleItem(item: any) {
  const newVal = !item.is_checked
  item.is_checked = newVal
  item.checked_at = newVal ? new Date().toISOString() : null
  await $fetch(`/api/qc-forms/${id}/items/${item.id}`, {
    method: 'PATCH',
    body: { is_checked: newVal },
  })
}

async function markDone(checker: any) {
  markingDone.value = checker.user_id
  try {
    await $fetch(`/api/qc-forms/${id}/checkers/${checker.user_id}/done`, { method: 'POST' })
    await fetchForm()
  } catch (e: any) {
    alert(e?.data?.message || 'Gagal')
  } finally {
    markingDone.value = null
  }
}

async function addManualItem() {
  if (!newItemName.value.trim() || !newItemCheckerIds.value.length) return
  await $fetch(`/api/qc-forms/${id}/items`, {
    method: 'POST',
    body: { item_name: newItemName.value.trim(), checker_ids: newItemCheckerIds.value },
  })
  newItemName.value = ''
  newItemCheckerIds.value = []
  await fetchForm()
}

// Ticket modal
const ticketModal = reactive({
  show: false,
  item: null as any,
  checker: null as any,
  title: '',
  priority_id: '' as any,
  description: '',
  loading: false,
})

function openTicketModal(item: any, checker: any) {
  ticketModal.item = item
  ticketModal.checker = checker
  ticketModal.title = ''
  ticketModal.priority_id = ''
  ticketModal.description = ''
  ticketModal.show = true
}

async function submitOpenTicket() {
  if (!ticketModal.priority_id) return
  ticketModal.loading = true
  try {
    await $fetch(`/api/qc-forms/${id}/items/${ticketModal.item.id}`, {
      method: 'PATCH',
      body: {
        open_ticket: {
          priority_id: ticketModal.priority_id,
          title: ticketModal.title || `[QC] ${ticketModal.item.item_name}`,
          description: ticketModal.description || undefined,
        },
      },
    })
    ticketModal.show = false
    await fetchForm()
  } catch (e: any) {
    alert(e?.data?.message || 'Gagal membuat ticket')
  } finally {
    ticketModal.loading = false
  }
}

const tabStore = useTabStore()

onMounted(async () => {
  await fetchForm()
  if (isChecker.value) timer.fetchLogs()
  if (form.value) {
    tabStore.addQcTab({ id, task_title: form.value.task_title, sequence: form.value.sequence }, false)
    tabStore.activeQcTabId = id
  }
})

onUnmounted(() => {
  if (tabStore.activeQcTabId === id) tabStore.activeQcTabId = null
})
</script>

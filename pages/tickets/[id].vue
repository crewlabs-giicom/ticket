<template>
  <div v-if="ticket" class="max-w-4xl mx-auto space-y-4">
    <!-- Header -->
    <div class="card p-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{{ ticket.ticket_number }}</span>
            <span class="badge text-white text-xs" :style="{ background: ticket.status_color }">{{ ticket.status_name }}</span>
            <div class="flex items-center gap-1"><span class="priority-dot" :style="{ background: ticket.priority_color }" /><span class="text-xs text-slate-600">{{ ticket.priority_name }}</span></div>
            <span v-if="ticket.sla_breached" class="badge bg-red-100 text-red-700">SLA Breach</span>
          </div>
          <h2 class="text-lg font-semibold text-slate-900">{{ ticket.title }}</h2>
          <p class="text-sm text-slate-500 mt-1">{{ ticket.project_name }} · Dibuat oleh {{ ticket.created_by_name }} · {{ timeAgo(ticket.created_at) }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <template v-if="auth.isStaffOrAdmin">
            <AppSelect
              v-model="editStatus"
              :options="statuses.map((s: any) => ({ value: s.id, label: s.name }))"
              placeholder="Status"
              class="w-36"
              @update:modelValue="updateField('status_id', $event)"
            />
            <AppSelect
              v-model="editAssigned"
              :options="[{ value: '', label: 'Unassigned' }, ...staff.map((u: any) => ({ value: u.id, label: u.name }))]"
              placeholder="Unassigned"
              class="w-36"
              @update:modelValue="updateField('assigned_to', $event)"
            />
            <button @click="tabs.togglePin(ticket.id)" class="btn-ghost text-xs py-1.5">
              {{ tabs.tabs.find(t=>t.id===ticket.id)?.pinned ? 'Unpin Tab' : 'Pin Tab' }}
            </button>
          </template>
          <button @click="openChat" class="btn-ghost text-xs py-1.5 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
              <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.25v.05a43.143 43.143 0 00-1.085.628 1.5 1.5 0 00-.372 2.273c.307.38.712.646 1.171.76a4.38 4.38 0 01-.103.065 1.5 1.5 0 01-1.5-2.598l.032-.018a43.167 43.167 0 00-.966-.553 1.5 1.5 0 01-.62-2.039A14.31 14.31 0 013.505 2.365z"/>
              <path d="M7.5 9.25c0-2.075 1.56-3.818 3.6-4.052a41.647 41.647 0 014.8 0C17.94 5.432 19.5 7.175 19.5 9.25v1.5c0 2.075-1.56 3.818-3.6 4.052a41.647 41.647 0 01-4.8 0C9.06 14.568 7.5 12.825 7.5 11.75v-2.5z"/>
            </svg>
            Chat
          </button>
        </div>
      </div>

      <div class="mt-4 prose prose-sm max-w-none">
        <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ ticket.description }}</p>
      </div>

      <div class="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
        <div><span class="font-medium">Assigned:</span> {{ ticket.assigned_to_name || 'Belum di-assign' }}</div>
        <div><span class="font-medium">Due:</span> <span :class="ticket.sla_breached ? 'text-red-600 font-medium' : ''">{{ ticket.due_date ? new Date(ticket.due_date).toLocaleString('id') : '—' }}</span></div>
        <div><span class="font-medium">Dibuat:</span> {{ new Date(ticket.created_at).toLocaleString('id') }}</div>
        <div v-if="ticket.resolved_at"><span class="font-medium">Resolved:</span> {{ new Date(ticket.resolved_at).toLocaleString('id') }}</div>
      </div>

      <!-- Task & subsystem links -->
      <div class="mt-4 flex flex-wrap gap-3 text-xs border-t border-slate-100 pt-4">
        <NuxtLink v-if="ticket.task_id" :to="`/tasks`" class="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Task: {{ ticket.task_title || ticket.task_id }}
        </NuxtLink>
        <span v-if="ticket.subsystem" class="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
          {{ ticket.subsystem }}
        </span>
      </div>

      <!-- Ticket-level Attachments -->
      <div v-if="ticket.attachments?.length" class="mt-4 border-t border-slate-100 pt-4">
        <p class="text-xs font-semibold text-slate-600 mb-2">Lampiran ({{ ticket.attachments.length }})</p>
        <div class="flex flex-wrap gap-2">
          <a v-for="a in ticket.attachments" :key="a.id" :href="`/uploads/${a.filename}`" target="_blank" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-700">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            {{ a.original_name }}
          </a>
        </div>
      </div>
    </div>

    <!-- Chat Responses -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-900 mb-4">Diskusi ({{ ticket.responses?.filter((r:any) => !r.is_internal || auth.isStaffOrAdmin).length || 0 }})</h3>

      <div class="space-y-3">
        <div v-for="r in ticket.responses" :key="r.id" :class="['flex gap-2', r.user_id === auth.user?.id ? 'flex-row-reverse' : 'flex-row']">
          <!-- Avatar -->
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-1"
            :class="r.user_id === auth.user?.id ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'">
            {{ r.user_name?.charAt(0) }}
          </div>

          <!-- Bubble -->
          <div :class="['max-w-[72%]', r.user_id === auth.user?.id ? 'items-end' : 'items-start', 'flex flex-col gap-1']">
            <!-- Name + timestamp -->
            <div :class="['flex items-center gap-1.5 text-[11px]', r.user_id === auth.user?.id ? 'flex-row-reverse' : 'flex-row']">
              <span class="font-semibold text-slate-700">{{ r.user_name }}</span>
              <span v-if="r.is_internal" class="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Internal</span>
              <span class="text-slate-400">{{ timeAgo(r.created_at) }}</span>
            </div>

            <!-- Message bubble -->
            <div :class="[
              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
              r.user_id === auth.user?.id
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : r.is_internal
                  ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm'
            ]">
              <p class="whitespace-pre-wrap">{{ r.message }}</p>

              <!-- Response attachments -->
              <div v-if="r.attachments?.length" :class="['mt-2 flex flex-wrap gap-1.5', r.user_id === auth.user?.id ? 'justify-end' : '']">
                <a v-for="a in r.attachments" :key="a.id" :href="`/uploads/${a.filename}`" target="_blank"
                  :class="['flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors',
                    r.user_id === auth.user?.id
                      ? 'bg-white/20 hover:bg-white/30 text-white'
                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700']">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span class="max-w-[120px] truncate">{{ a.original_name }}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reply form -->
      <div class="mt-5 border-t border-slate-200 pt-5">
        <div v-if="auth.isStaffOrAdmin" class="flex items-center gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="isInternal" class="w-3.5 h-3.5 rounded" />
            <span class="text-xs text-slate-600">Internal Note (hanya staff)</span>
          </label>
        </div>
        <textarea v-model="reply" :class="['input min-h-[80px] resize-none', isInternal && 'border-amber-300 bg-amber-50/50']" :placeholder="isInternal ? 'Tulis catatan internal...' : 'Tulis balasan...'" />

        <!-- Reply attachments preview -->
        <div v-if="replyFiles.length" class="flex flex-wrap gap-2 mt-2">
          <div v-for="(f, i) in replyFiles" :key="i" class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="max-w-[120px] truncate">{{ f.original_name }}</span>
            <button type="button" @click="replyFiles.splice(i, 1)" class="text-slate-400 hover:text-red-500 ml-0.5">×</button>
          </div>
        </div>
        <p v-if="uploadError" class="text-xs text-red-600 mt-1">{{ uploadError }}</p>

        <div class="flex items-center justify-between mt-2">
          <!-- Attach button -->
          <label class="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 hover:text-primary-600 transition-colors" :class="uploading && 'opacity-50 pointer-events-none'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            {{ uploading ? 'Mengupload...' : 'Lampirkan file' }}
            <input ref="fileInput" type="file" multiple class="hidden" :disabled="uploading" @change="handleReplyFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
          </label>
          <button @click="submitReply" :disabled="!reply.trim() || sending || uploading" class="btn-primary">{{ sending ? 'Mengirim...' : 'Kirim' }}</button>
        </div>
      </div>
    </div>
    <!-- Ticket references -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-900">Referensi Ticket</h3>
        <button @click="showLinkModal = true" class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Link referensi
        </button>
      </div>

      <div v-if="ticket.links?.length || ticket.backLinks?.length" class="space-y-2">
        <div v-for="lnk in ticket.links" :key="lnk.id" class="flex items-center gap-2 text-sm">
          <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{{ lnk.relation_type }}</span>
          <NuxtLink :to="`/tickets/${lnk.referenced_ticket_id}`" class="text-indigo-600 hover:underline font-mono text-xs">{{ lnk.ref_ticket_number }}</NuxtLink>
          <span class="text-slate-500 text-xs truncate">{{ lnk.ref_ticket_title }}</span>
        </div>
        <div v-for="bl in ticket.backLinks" :key="bl.id" class="flex items-center gap-2 text-sm">
          <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">direferensi oleh</span>
          <NuxtLink :to="`/tickets/${bl.ticket_id}`" class="text-indigo-600 hover:underline font-mono text-xs">{{ bl.new_ticket_number }}</NuxtLink>
          <span class="text-slate-500 text-xs truncate">{{ bl.new_ticket_title }}</span>
        </div>
      </div>
      <p v-else class="text-xs text-slate-400">Belum ada referensi ticket terkait.</p>
    </div>

    <!-- Link modal -->
    <div v-if="showLinkModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showLinkModal = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="font-semibold mb-4">Link Ticket Referensi</h3>
        <div class="space-y-3">
          <input v-model="linkSearch" @input="searchTickets" type="text" placeholder="Cari ticket by judul / nomor…" class="input text-sm w-full" />
          <div v-if="linkResults.length" class="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
            <button v-for="t in linkResults" :key="t.id" @click="selectLinkTicket(t)" class="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm">
              <span class="font-mono text-xs text-slate-400">{{ t.ticket_number }}</span>
              <span class="flex-1 truncate">{{ t.title }}</span>
            </button>
          </div>
          <div v-if="selectedLinkTicket" class="bg-indigo-50 rounded-lg p-3 text-sm">
            <p>Link ke: <strong>{{ selectedLinkTicket.ticket_number }}</strong> — {{ selectedLinkTicket.title }}</p>
            <AppSelect
              v-model="linkType"
              :options="[{ value: 'recurring', label: 'recurring' }, { value: 'duplicate', label: 'duplicate' }]"
              placeholder="Tipe"
              class="mt-2 w-40"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="showLinkModal = false" class="text-sm text-slate-600">Batal</button>
          <button @click="submitLink" :disabled="!selectedLinkTicket || linkSaving" class="btn-primary text-sm">
            {{ linkSaving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-48 text-slate-400">Ticket tidak ditemukan</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const tabs = useTabStore()
const chatWidget = useChatWidgetStore()

function openChat() {
  if (!ticket.value) return
  chatWidget.openTicket({ ticketId: ticket.value.id, ticketNumber: ticket.value.ticket_number, title: ticket.value.title })
}
const route = useRoute()
const id = route.params.id

const { data: res, refresh } = await useFetch(`/api/tickets/${id}`)
const ticket = computed(() => (res.value as any)?.data)

const { data: sd } = await useFetch('/api/statuses')
const { data: ud } = await useFetch('/api/users')
const statuses = computed(() => (sd.value as any)?.data || [])
const staff = computed(() => ((ud.value as any)?.data || []).filter((u: any) => u.role !== 'customer' && u.is_active))

const editStatus = ref(ticket.value?.status_id)
const editAssigned = ref(ticket.value?.assigned_to || '')
const reply = ref('')
const isInternal = ref(false)
const sending = ref(false)
const uploading = ref(false)
const uploadError = ref('')
const replyFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])
const fileInput = ref<HTMLInputElement>()

onMounted(() => {
  tabs.clearUnread(Number(id))
  if (ticket.value) tabs.openTab({ id: ticket.value.id, ticket_number: ticket.value.ticket_number, title: ticket.value.title })
})

async function updateField(field: string, value: any) {
  await $fetch(`/api/tickets/${id}`, { method: 'PUT', body: { [field]: value } })
  await refresh()
}

async function handleReplyFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  uploading.value = true
  uploadError.value = ''
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      const r = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      replyFiles.value.push(r.data)
    }
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Gagal mengupload file'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function submitReply() {
  if (!reply.value.trim()) return
  sending.value = true
  try {
    await $fetch(`/api/tickets/${id}/responses`, {
      method: 'POST',
      body: { message: reply.value, is_internal: isInternal.value, attachments: replyFiles.value },
    })
    reply.value = ''
    isInternal.value = false
    replyFiles.value = []
    await refresh()
  } finally { sending.value = false }
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j lalu`
  return `${Math.floor(h / 24)}h lalu`
}

// Ticket links
const showLinkModal = ref(false)
const linkSearch = ref('')
const linkResults = ref<any[]>([])
const selectedLinkTicket = ref<any>(null)
const linkType = ref<'recurring' | 'duplicate'>('recurring')
const linkSaving = ref(false)

let linkSearchTimer: ReturnType<typeof setTimeout>
function searchTickets() {
  clearTimeout(linkSearchTimer)
  linkSearchTimer = setTimeout(async () => {
    if (!linkSearch.value.trim()) { linkResults.value = []; return }
    const res = await $fetch<any>('/api/tickets', { query: { search: linkSearch.value } })
    linkResults.value = (res.data || []).filter((t: any) => t.id !== Number(id)).slice(0, 10)
  }, 300)
}

function selectLinkTicket(t: any) {
  selectedLinkTicket.value = t
  linkSearch.value = ''
  linkResults.value = []
}

async function submitLink() {
  if (!selectedLinkTicket.value) return
  linkSaving.value = true
  try {
    await $fetch('/api/ticket-links', {
      method: 'POST',
      body: { ticket_id: Number(id), referenced_ticket_id: selectedLinkTicket.value.id, relation_type: linkType.value },
    })
    showLinkModal.value = false
    selectedLinkTicket.value = null
    linkType.value = 'recurring'
    await refresh()
  } finally { linkSaving.value = false }
}
</script>

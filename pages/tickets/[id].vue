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
        <div class="flex items-center gap-2 flex-wrap" v-if="auth.isStaffOrAdmin">
          <select v-model="editStatus" @change="updateField('status_id', editStatus)" class="input text-xs w-36">
            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <select v-model="editAssigned" @change="updateField('assigned_to', editAssigned)" class="input text-xs w-36">
            <option value="">Unassigned</option>
            <option v-for="u in staff" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <button @click="tabs.togglePin(ticket.id)" class="btn-ghost text-xs py-1.5">
            {{ tabs.tabs.find(t=>t.id===ticket.id)?.pinned ? 'Unpin Tab' : 'Pin Tab' }}
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
  </div>
  <div v-else class="flex items-center justify-center h-48 text-slate-400">Ticket tidak ditemukan</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const tabs = useTabStore()
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
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      <div v-if="pending" class="text-center text-sm text-gray-400 py-4">Memuat pesan...</div>
      <div v-else-if="!messages.length" class="text-center text-sm text-gray-400 py-4">Belum ada pesan. Mulai percakapan.</div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex gap-2"
        :class="msg.sender_id === authUser?.id ? 'flex-row-reverse' : 'flex-row'"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
          :class="msg.sender_id === authUser?.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'"
        >
          {{ initials(msg.sender_name) }}
        </div>
        <div :class="msg.sender_id === authUser?.id ? 'items-end' : 'items-start'" class="flex flex-col max-w-[75%]">
          <span class="text-[11px] text-gray-400 mb-0.5">{{ msg.sender_name }}</span>
          <div
            class="rounded-2xl px-3 py-2 text-sm break-words"
            :class="msg.sender_id === authUser?.id
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'"
          >
            <p v-if="msg.message" class="whitespace-pre-wrap">{{ msg.message }}</p>
            <!-- Attachments in bubble -->
            <div v-if="msg.attachments?.length" :class="['flex flex-wrap gap-1.5', msg.message ? 'mt-2' : '']">
              <template v-for="a in msg.attachments" :key="a.id">
                <button v-if="isImage(a.mime_type)" @click="openChatLightbox(a.id)" class="group relative w-16 h-16 rounded-lg overflow-hidden border border-white/30 hover:border-white/60 transition-colors shrink-0">
                  <img :src="`/uploads/${a.filename}`" :alt="a.original_name" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
                <a v-else :href="`/uploads/${a.filename}`" target="_blank"
                  class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-white/20 hover:bg-white/30 text-inherit transition-colors">
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span class="max-w-[100px] truncate">{{ a.original_name }}</span>
                </a>
              </template>
            </div>
          </div>
          <span class="text-[10px] text-gray-400 mt-0.5">{{ timeAgo(msg.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Pending files preview -->
    <div v-if="pendingFiles.length" class="border-t border-gray-100 px-2 py-1.5 flex flex-wrap gap-1.5 bg-gray-50">
      <div v-for="(f, i) in pendingFiles" :key="i" class="relative group">
        <img v-if="isImage(f.mime_type)" :src="`/uploads/${f.filename}`" class="w-12 h-12 object-cover rounded-lg border border-gray-200" />
        <div v-else class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 max-w-[100px]">
          <svg class="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span class="truncate">{{ f.original_name }}</span>
        </div>
        <button @click="pendingFiles.splice(i, 1)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">×</button>
      </div>
      <p v-if="uploading" class="text-[11px] text-indigo-500 self-center">Mengupload...</p>
    </div>

    <!-- Input -->
    <div class="border-t border-gray-200 p-2 flex gap-2 items-end">
      <!-- Attachment button -->
      <label class="shrink-0 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors self-center" :class="uploading && 'opacity-50 pointer-events-none'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.243z" clip-rule="evenodd"/>
        </svg>
        <input type="file" multiple class="hidden" :disabled="uploading" @change="handleFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
      </label>

      <textarea
        v-model="draft"
        rows="1"
        placeholder="Ketik pesan... (Ctrl+V untuk paste gambar)"
        class="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[36px] max-h-24"
        @keydown.enter.exact.prevent="send"
        @input="autoResize"
        @paste="handlePaste"
        ref="inputEl"
      />
      <button
        @click="send"
        :disabled="(!draft.trim() && !pendingFiles.length) || sending || uploading"
        class="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 transition shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ ticketId: number }>()

const authStore = useAuthStore()
const authUser = computed(() => authStore.user)
const lb = useLightbox()

const messages = ref<any[]>([])
const draft = ref('')
const sending = ref(false)
const pending = ref(true)
const uploading = ref(false)
const pendingFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])
const scrollEl = ref<HTMLElement>()
const inputEl = ref<HTMLTextAreaElement>()

function isImage(mime?: string) { return !!mime?.startsWith('image/') }

const allChatImages = computed(() => {
  const imgs: Array<{ url: string; name: string; id: number }> = []
  for (const msg of messages.value) {
    for (const a of (msg.attachments || [])) {
      if (isImage(a.mime_type)) imgs.push({ url: `/uploads/${a.filename}`, name: a.original_name, id: a.id })
    }
  }
  return imgs
})

function openChatLightbox(attachmentId: number) {
  const idx = allChatImages.value.findIndex(i => i.id === attachmentId)
  if (idx < 0) return
  lb.open(allChatImages.value.map(i => ({ url: i.url, name: i.name })), idx)
}

async function fetchMessages() {
  try {
    const res = await $fetch(`/api/tickets/${props.ticketId}/messages`) as any
    messages.value = res.data
  } finally {
    pending.value = false
  }
}

async function markRead() {
  await $fetch(`/api/tickets/${props.ticketId}/messages/read`, { method: 'PATCH' }).catch(() => {})
  const chatWidget = useChatWidgetStore()
  chatWidget.markRead(props.ticketId)
}

async function uploadFile(file: File, name?: string) {
  const fd = new FormData()
  fd.append('file', file, name || file.name)
  const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
  pendingFiles.value.push(res.data)
}

async function handleFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(input.files)) await uploadFile(file)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function handlePaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
  if (!items.length) return
  e.preventDefault()
  uploading.value = true
  try {
    for (const item of items) {
      const file = item.getAsFile()
      if (file) {
        const ext = item.type.split('/')[1] || 'png'
        await uploadFile(file, `paste-${Date.now()}.${ext}`)
      }
    }
  } finally {
    uploading.value = false
  }
}

async function send() {
  if ((!draft.value.trim() && !pendingFiles.value.length) || sending.value || uploading.value) return
  sending.value = true
  const msg = draft.value.trim()
  const files = [...pendingFiles.value]
  draft.value = ''
  pendingFiles.value = []
  if (inputEl.value) inputEl.value.style.height = 'auto'
  try {
    const res = await $fetch(`/api/tickets/${props.ticketId}/messages`, {
      method: 'POST',
      body: { message: msg, attachments: files },
    }) as any
    messages.value.push(res.data)
    scrollToBottom()
  } catch {
    draft.value = msg
    pendingFiles.value = files
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

function initials(name: string) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}j`
  return `${Math.floor(hrs / 24)}h`
}

const chatWidget = useChatWidgetStore()

watch(() => chatWidget.incomingMessage, (msg) => {
  if (!msg || msg.ticket_id !== props.ticketId) return
  if (!msg.attachments) msg.attachments = []
  messages.value.push(msg)
  markRead()
  scrollToBottom()
})

onMounted(async () => {
  await fetchMessages()
  await markRead()
  scrollToBottom()
})
</script>

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
            {{ msg.message }}
          </div>
          <span class="text-[10px] text-gray-400 mt-0.5">{{ timeAgo(msg.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-gray-200 p-2 flex gap-2 items-end">
      <textarea
        v-model="draft"
        rows="1"
        placeholder="Ketik pesan..."
        class="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[36px] max-h-24"
        @keydown.enter.exact.prevent="send"
        @input="autoResize"
        ref="inputEl"
      />
      <button
        @click="send"
        :disabled="!draft.trim() || sending"
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

const messages = ref<any[]>([])
const draft = ref('')
const sending = ref(false)
const pending = ref(true)
const scrollEl = ref<HTMLElement>()
const inputEl = ref<HTMLTextAreaElement>()

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

async function send() {
  if (!draft.value.trim() || sending.value) return
  sending.value = true
  const msg = draft.value.trim()
  draft.value = ''
  if (inputEl.value) inputEl.value.style.height = 'auto'
  try {
    const res = await $fetch(`/api/tickets/${props.ticketId}/messages`, { method: 'POST', body: { message: msg } }) as any
    messages.value.push(res.data)
    scrollToBottom()
  } catch {
    draft.value = msg
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

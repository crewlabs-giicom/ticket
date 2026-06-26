<template>
  <div
    class="relative flex flex-col rounded-2xl shadow-md border border-yellow-300/40 transition-shadow hover:shadow-lg"
    :style="{ background: note.color || '#fef9c3', width: '17rem', minHeight: '12rem', maxHeight: '28rem', fontFamily: '\'Segoe UI\', \'Trebuchet MS\', sans-serif' }"
  >
    <!-- Header -->
    <div class="flex items-center gap-1.5 px-3 pt-3 pb-2">
      <!-- Pin badge -->
      <span v-if="note.is_pinned" class="text-xs text-yellow-700" title="Di-pin">📌</span>
      <!-- Title editable -->
      <input
        :value="note.title"
        @blur="onTitleBlur"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        class="flex-1 bg-transparent border-none outline-none font-bold text-yellow-900 text-sm placeholder-yellow-400 min-w-0"
        placeholder="Judul catatan"
      />
      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <!-- Color picker -->
        <div class="relative" :ref="el => colorRefs[note.id] = el as HTMLElement">
          <button
            @click.stop="toggleColorPicker"
            class="w-4 h-4 rounded-full border-2 border-yellow-400/60 hover:scale-110 transition-transform"
            :style="{ background: note.color || '#fef9c3' }"
            title="Warna"
          />
          <div v-if="showColorPicker" class="absolute right-0 top-6 z-30 flex gap-1.5 bg-white rounded-xl shadow-xl p-2 border border-gray-100">
            <button
              v-for="c in colors"
              :key="c"
              @click.stop="changeColor(c)"
              class="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
              :style="{ background: c, borderColor: note.color === c ? '#78350f' : 'transparent' }"
            />
          </div>
        </div>
        <!-- Pin/Unpin -->
        <button
          @click="togglePin"
          :title="note.is_pinned ? 'Unpin' : 'Pin ke layar'"
          :class="['p-0.5 rounded transition-colors text-xs', note.is_pinned ? 'text-yellow-700 hover:text-yellow-900' : 'text-yellow-400 hover:text-yellow-700']"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <!-- Select mode toggle -->
        <button
          @click="toggleSelect"
          :title="isThisSelectMode ? 'Batal pilih' : 'Pilih item untuk tiket'"
          :class="['p-0.5 rounded transition-colors', isThisSelectMode ? 'text-indigo-500' : 'text-yellow-400 hover:text-yellow-700']"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 12h6m-6 4h4" />
          </svg>
        </button>
        <!-- Delete -->
        <button @click="onDelete" title="Hapus catatan" class="p-0.5 rounded text-yellow-400 hover:text-red-500 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="w-full h-px bg-yellow-300/50 mx-0" />

    <!-- Items -->
    <div class="flex-1 overflow-y-auto py-2 px-1">
      <div
        v-for="(item, idx) in sortedItems"
        :key="item.id"
        class="group flex items-start gap-1.5 px-2 py-1 hover:bg-yellow-200/40 rounded-lg transition-colors"
      >
        <!-- Select checkbox (ticket mode) -->
        <button
          v-if="isThisSelectMode"
          @click="store.toggleItemSelect(item.id)"
          :class="['mt-0.5 w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center',
            store.selectedItemIds.has(item.id) ? 'bg-indigo-500 border-indigo-500' : 'border-yellow-500 bg-transparent']"
        >
          <svg v-if="store.selectedItemIds.has(item.id)" class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <!-- Done checkbox -->
        <button
          v-else
          @click="store.toggleCheck(note.id, item)"
          :class="['mt-0.5 w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center',
            item.is_checked ? 'bg-yellow-400 border-yellow-400' : 'border-yellow-500 bg-transparent hover:border-yellow-700']"
        >
          <svg v-if="item.is_checked" class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <!-- Number -->
        <span class="text-yellow-600 text-[11px] font-bold w-4 text-right flex-shrink-0 mt-0.5 select-none">{{ idx + 1 }}.</span>
        <!-- Text -->
        <input
          :value="item.content"
          @blur="onItemBlur($event, item)"
          @keydown.enter.prevent="onItemEnter($event, item)"
          @keydown.backspace="onItemBackspace($event, item)"
          :class="['flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-yellow-300 leading-relaxed min-w-0',
            item.is_checked ? 'line-through text-yellow-500' : '']"
          placeholder="Tulis sesuatu..."
          :ref="el => { if (el) itemInputRefs[item.id] = el as HTMLInputElement }"
        />
        <!-- Delete item -->
        <button
          @click="store.deleteItem(note.id, item.id)"
          class="opacity-0 group-hover:opacity-100 text-yellow-400 hover:text-red-400 transition-all p-0.5 flex-shrink-0 mt-0.5"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Add item -->
      <button
        @click="addNewItem"
        class="w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-xs text-yellow-500 hover:text-yellow-700 hover:bg-yellow-200/30 rounded-lg transition-colors mt-0.5"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Tambah item
      </button>
    </div>

    <!-- Footer: create ticket CTA -->
    <div v-if="isThisSelectMode" class="px-3 py-2 border-t border-yellow-300/50 space-y-1.5">
      <div class="flex items-center justify-between">
        <button @click="selectAll" class="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
          Pilih Semua ({{ note.items.length }})
        </button>
        <button v-if="store.selectedItemIds.size > 0" @click="store.deselectAll()" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Batalkan
        </button>
      </div>
      <button
        v-if="store.selectedItemIds.size > 0"
        @click="store.openTicketModal(note.id)"
        class="w-full flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-xl transition-colors"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
        Buat Tiket ({{ store.selectedItemIds.size }})
      </button>
      <p v-else class="text-center text-xs text-yellow-600 py-0.5">Pilih item untuk dibuat tiket</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Wishlist, WishlistItem } from '~/stores/wishlist'

const props = defineProps<{ note: Wishlist }>()
const store = useWishlistStore()

const showColorPicker = ref(false)
const colorRefs: Record<number, HTMLElement> = {}
const itemInputRefs: Record<number, HTMLInputElement> = {}
const pendingFocusId = ref<number | null>(null)
const savingItemId = ref<number | null>(null)

const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fde68a', '#fbcfe8', '#e9d5ff', '#fed7aa', '#cffafe']

const sortedItems = computed(() =>
  [...props.note.items].sort((a, b) => a.order_index - b.order_index || a.id - b.id)
)

const isThisSelectMode = computed(() =>
  store.isSelectMode && store.ticketSourceNoteId === props.note.id
)

function toggleColorPicker() { showColorPicker.value = !showColorPicker.value }

function changeColor(c: string) {
  store.updateNote(props.note.id, { color: c })
  showColorPicker.value = false
}

function togglePin() {
  if (props.note.is_pinned) store.unpinNote(props.note.id)
  else store.pinNote(props.note.id)
}

function toggleSelect() {
  store.toggleSelectMode(props.note.id)
}

function selectAll() {
  store.selectAll(props.note.id)
}

function onTitleBlur(e: Event) {
  const val = (e.target as HTMLInputElement).value.trim()
  if (val !== props.note.title) {
    store.updateNote(props.note.id, { title: val || 'Catatan' })
  }
}

async function onItemBlur(e: Event, item: WishlistItem) {
  if (savingItemId.value === item.id) return
  const val = (e.target as HTMLInputElement).value.trim()
  if (!val) {
    await store.deleteItem(props.note.id, item.id)
    return
  }
  if (val !== item.content) {
    await store.updateItem(props.note.id, item.id, { content: val })
  }
}

async function onItemEnter(e: Event, item: WishlistItem) {
  savingItemId.value = item.id
  const val = (e.target as HTMLInputElement).value.trim()
  if (val !== item.content) {
    await store.updateItem(props.note.id, item.id, { content: val || item.content })
  }
  savingItemId.value = null
  const newItem = await store.addItem(props.note.id, '')
  pendingFocusId.value = newItem.id
}

async function onItemBackspace(e: KeyboardEvent, item: WishlistItem) {
  if ((e.target as HTMLInputElement).value === '') {
    e.preventDefault()
    await store.deleteItem(props.note.id, item.id)
  }
}

async function addNewItem() {
  const newItem = await store.addItem(props.note.id, '')
  pendingFocusId.value = newItem.id
}

const { confirmDelete } = useConfirm()
async function onDelete() {
  const ok = await confirmDelete(
    'Catatan dan semua itemnya akan dihapus permanen.',
    `Hapus "${props.note.title}"?`
  )
  if (ok) await store.deleteNote(props.note.id)
}

watch(() => props.note.items.length, async () => {
  if (pendingFocusId.value !== null) {
    await nextTick()
    const el = itemInputRefs[pendingFocusId.value]
    if (el) { el.focus(); pendingFocusId.value = null }
  }
})

// Close color picker on outside click
const onDocClick = (e: MouseEvent) => {
  const ref = colorRefs[props.note.id]
  if (ref && !ref.contains(e.target as Node)) showColorPicker.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

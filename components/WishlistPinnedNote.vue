<template>
  <!-- Mobile: bottom bar stacked -->
  <div
    v-if="isMobile"
    class="fixed z-[60] left-0 right-0 shadow-2xl transition-all duration-200"
    :style="{ bottom: `${mobileOffset}px`, fontFamily: '\'Segoe UI\', \'Trebuchet MS\', sans-serif' }"
  >
    <div class="rounded-t-2xl border border-yellow-300/60 overflow-hidden" :style="{ background: note.color || '#fef9c3' }">
      <!-- Title bar (always visible) -->
      <div class="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none" @click="toggleMinimize">
        <span class="text-sm">📌</span>
        <span class="flex-1 font-semibold text-yellow-900 text-sm truncate">{{ note.title }}</span>
        <span class="text-yellow-700 text-xs">{{ note.items.filter(i => !i.is_checked).length }} item</span>
        <button @click.stop="toggleMinimize" class="text-yellow-700 hover:text-yellow-900 p-0.5">
          <svg class="w-4 h-4 transition-transform" :class="note.is_minimized ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button @click.stop="store.unpinNote(note.id)" class="text-yellow-500 hover:text-red-500 p-0.5 transition-colors" title="Unpin">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Expanded content (mobile) -->
      <div v-if="!note.is_minimized" class="border-t border-yellow-300/50 max-h-64 overflow-y-auto">
        <WishlistPinnedNoteItems :note="note" />
      </div>
    </div>
  </div>

  <!-- Desktop: draggable floating -->
  <div
    v-else
    ref="dragEl"
    class="fixed z-[60] rounded-2xl shadow-2xl border border-yellow-300/60 overflow-hidden select-none"
    :style="[
      dragStyle,
      { background: note.color || '#fef9c3', width: '17rem', fontFamily: '\'Segoe UI\', \'Trebuchet MS\', sans-serif' }
    ]"
  >
    <!-- Title bar / drag handle -->
    <div class="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing">
      <!-- Drag dots -->
      <svg class="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
        <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
      </svg>
      <span class="flex-1 font-semibold text-yellow-900 text-sm truncate min-w-0">{{ note.title }}</span>
      <!-- Minimize -->
      <button @click.stop="toggleMinimize" class="text-yellow-600 hover:text-yellow-900 p-0.5 transition-colors" :title="note.is_minimized ? 'Perluas' : 'Perkecil'">
        <svg class="w-3.5 h-3.5 transition-transform" :class="note.is_minimized ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <!-- Unpin -->
      <button @click.stop="store.unpinNote(note.id)" class="text-yellow-400 hover:text-red-500 p-0.5 transition-colors" title="Unpin">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Items (expanded) -->
    <div v-if="!note.is_minimized" class="border-t border-yellow-300/50 max-h-72 overflow-y-auto">
      <WishlistPinnedNoteItems :note="note" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDraggable, useWindowSize } from '@vueuse/core'
import type { Wishlist } from '~/stores/wishlist'

const props = defineProps<{ note: Wishlist; mobileOffset?: number }>()
const store = useWishlistStore()

const dragEl = ref<HTMLElement>()
const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

// Draggable (desktop only)
const { x, y, style: dragStyle } = useDraggable(dragEl, {
  initialValue: {
    x: props.note.pin_x ?? Math.max(16, window.innerWidth - 300),
    y: props.note.pin_y ?? 80,
  },
  onEnd() {
    // Clamp to viewport
    const clampedX = Math.max(0, Math.min(x.value, window.innerWidth - 280))
    const clampedY = Math.max(0, Math.min(y.value, window.innerHeight - 60))
    store.savePinPosition(props.note.id, clampedX, clampedY)
  },
})

function toggleMinimize() {
  store.toggleMinimize(props.note.id, !props.note.is_minimized)
}
</script>

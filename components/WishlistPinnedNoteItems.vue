<template>
  <div class="py-1.5 px-1">
    <div
      v-for="(item, idx) in sortedItems"
      :key="item.id"
      class="flex items-start gap-1.5 px-2 py-1 hover:bg-yellow-200/40 rounded-lg transition-colors group"
    >
      <!-- Done checkbox -->
      <button
        @click="store.toggleCheck(note.id, item)"
        :class="['mt-0.5 w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center',
          item.is_checked ? 'bg-yellow-400 border-yellow-400' : 'border-yellow-500 bg-transparent hover:border-yellow-700']"
      >
        <svg v-if="item.is_checked" class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <span class="text-yellow-600 text-[11px] font-bold w-4 text-right flex-shrink-0 mt-0.5 select-none">{{ idx + 1 }}.</span>
      <span
        :class="['flex-1 text-sm text-gray-800 leading-relaxed min-w-0 break-words select-text cursor-text',
          item.is_checked ? 'line-through text-yellow-500' : '']"
      >{{ item.content || '…' }}</span>
    </div>
    <!-- Link ke halaman untuk edit -->
    <NuxtLink
      to="/wishlist"
      class="flex items-center gap-1.5 px-2 py-1.5 mt-0.5 text-xs text-yellow-500 hover:text-yellow-700 hover:bg-yellow-200/30 rounded-lg transition-colors"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Edit di halaman catatan
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { Wishlist } from '~/stores/wishlist'

const props = defineProps<{ note: Wishlist }>()
const store = useWishlistStore()

const sortedItems = computed(() =>
  [...props.note.items].sort((a, b) => a.order_index - b.order_index || a.id - b.id)
)
</script>

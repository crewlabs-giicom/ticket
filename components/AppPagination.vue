<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
    <span class="text-xs text-slate-500">{{ from }}–{{ to }} dari {{ total }}</span>
    <div class="flex items-center gap-1">
      <button
        :disabled="page <= 1"
        @click="$emit('page-change', page - 1)"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <template v-for="p in pages" :key="p">
        <span v-if="p === '...'" class="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
        <button
          v-else
          @click="$emit('page-change', p)"
          :class="['w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100']"
        >{{ p }}</button>
      </template>
      <button
        :disabled="page >= totalPages"
        @click="$emit('page-change', page + 1)"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ page: number; totalPages: number; total: number; limit: number }>()
defineEmits<{ (e: 'page-change', page: number): void }>()

const from = computed(() => Math.min((props.page - 1) * props.limit + 1, props.total))
const to = computed(() => Math.min(props.page * props.limit, props.total))

const pages = computed(() => {
  const p = props.page
  const t = props.totalPages
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const result: (number | string)[] = [1]
  if (p > 3) result.push('...')
  for (let i = Math.max(2, p - 1); i <= Math.min(t - 1, p + 1); i++) result.push(i)
  if (p < t - 2) result.push('...')
  result.push(t)
  return result
})
</script>

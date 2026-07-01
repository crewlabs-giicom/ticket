<template>
  <div v-if="left !== null"
    class="absolute top-1/2 w-2.5 h-2.5 rotate-45 bg-fuchsia-500 border border-white shadow-sm -translate-y-1/2 -translate-x-1/2 z-10"
    :style="{ left: left + 'px' }"
    :title="`${milestone.name} — ${dateLabel}`">
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  milestone: any
  columns: { key: string; date: Date; label: string; isToday: boolean }[]
  colWidth: number
}>()

const dateLabel = computed(() => {
  if (!props.milestone.due_date) return '—'
  return parseWib(props.milestone.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
})

const left = computed(() => {
  if (!props.milestone.due_date || !props.columns.length) return null
  return Math.max(0, dateToOffsetPx(parseWib(props.milestone.due_date), props.columns, props.colWidth))
})
</script>

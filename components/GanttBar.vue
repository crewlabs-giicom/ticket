<template>
  <div class="absolute inset-0 flex items-center px-1">
    <!-- Grid lines -->
    <div class="absolute inset-0 flex pointer-events-none">
      <div v-for="col in columns" :key="col.key"
        class="flex-shrink-0 border-r border-slate-100 h-full"
        :style="{ width: colWidth + 'px' }">
      </div>
    </div>

    <!-- Bar -->
    <div v-if="barVisible"
      class="absolute h-5 rounded flex items-center px-1.5 overflow-hidden text-white text-[10px] font-medium shadow-sm select-none"
      :style="barStyle"
      :title="barTitle">
      <span class="truncate">{{ barLabel }}</span>
    </div>

    <!-- No date indicator -->
    <div v-else class="text-[10px] text-slate-300 pl-1 italic">—</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  item: any
  type: 'prd' | 'task' | 'qc'
  columns: { key: string; date: Date; label: string; isToday: boolean }[]
  colWidth: number
}>()

const startDate = computed(() => {
  const d = props.item.planned_start_date || props.item.actual_start_date || props.item.created_at
  // Default to the item's creation date when no start date is set, so it still gets a
  // visible bar without every undated item piling up on today's column.
  return d ? parseWib(d) : new Date()
})

const endDate = computed(() => {
  const d = props.item.revised_due_date || props.item.original_due_date || props.item.due_date || props.item.actual_end_date
  return d ? parseWib(d) : null
})

const isCompleted = computed(() => {
  if (props.type === 'prd') return props.item.status === 'done'
  if (props.type === 'task') return props.item.status === 'done'
  if (props.type === 'qc') return props.item.status === 'completed'
  return false
})

const { isOverdue: dateIsOverdue } = useDate()
const isOverdue = computed(() => {
  if (isCompleted.value) return false
  const raw = props.item.revised_due_date || props.item.original_due_date || props.item.due_date || props.item.actual_end_date
  return dateIsOverdue(raw)
})

const barColor = computed(() => {
  if (isCompleted.value) return '#10b981' // emerald
  if (isOverdue.value) return '#f87171'   // red
  if (props.type === 'prd') return '#6366f1'  // indigo
  if (props.type === 'task') return '#60a5fa' // blue
  return '#fbbf24' // amber (qc)
})

const barVisible = computed(() => !!(startDate.value || endDate.value))

const barStyle = computed(() => {
  if (!props.columns.length) return {}
  const firstDate = props.columns[0].date
  const msPerPx = (86400000) / props.colWidth

  let start = startDate.value
  let end = endDate.value

  // If only one date, show a 1-day bar
  if (!start && end) start = end
  if (!end && start) end = start

  const startMs = start!.getTime() - firstDate.getTime()
  const endMs = end!.getTime() - firstDate.getTime()

  const left = Math.max(0, startMs / msPerPx)
  const width = Math.max(props.colWidth * 0.8, (endMs - startMs) / msPerPx + props.colWidth)

  return {
    left: left + 'px',
    width: width + 'px',
    background: barColor.value,
    minWidth: '4px',
  }
})

const barTitle = computed(() => {
  const s = startDate.value?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) ?? '?'
  const e = endDate.value?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '?'
  return `${s} → ${e}`
})

const barLabel = computed(() => {
  if (props.type === 'prd') return props.item.title
  if (props.type === 'qc') return `QC #${props.item.sequence}`
  return props.item.title
})
</script>

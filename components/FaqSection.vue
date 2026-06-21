<template>
  <div class="card overflow-hidden">
    <div class="flex items-center gap-2.5 px-5 py-4 bg-slate-50 border-b border-slate-100">
      <span class="text-lg">{{ icon }}</span>
      <h3 class="font-semibold text-slate-900 text-sm">{{ title }}</h3>
      <span v-if="adminOnly" class="ml-auto text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Admin only</span>
    </div>
    <div class="divide-y divide-slate-100">
      <div v-for="(item, i) in items" :key="i">
        <button
          class="w-full flex items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          @click="toggle(i)"
        >
          <span class="text-sm font-medium text-slate-800">{{ item.q }}</span>
          <svg
            class="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform duration-200"
            :class="{ 'rotate-180': open[i] }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="open[i]" class="px-5 pb-4 text-sm text-slate-600 leading-relaxed" v-html="item.a" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string
  title: string
  items: { q: string; a: string }[]
  adminOnly?: boolean
}>()

const open = ref<Record<number, boolean>>({})
function toggle(i: number) {
  open.value[i] = !open.value[i]
}
</script>

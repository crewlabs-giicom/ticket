<template>
  <button
    @click="$emit('click')"
    :disabled="loading"
    class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
    title="Refresh data"
  >
    <svg class="w-4 h-4" :class="loading && 'animate-spin'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ loading?: boolean }>()
defineEmits(['click'])
</script>

<template>
  <span
    v-if="show"
    class="inline-flex items-center gap-0.5 text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse"
  >
    Balasan baru
  </span>
</template>

<script setup lang="ts">
defineProps<{ show: boolean }>()
</script>

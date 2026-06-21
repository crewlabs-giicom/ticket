<template>
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
      <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" opacity="0.15"/>
        <path d="M9 12l2 2 4-4"/>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 8v1M12 15v1"/>
      </svg>
    </div>
    <span v-if="!iconOnly" class="font-semibold text-slate-900 text-sm">Shadow Care</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ iconOnly?: boolean }>()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 flex items-center justify-center p-4">
    <slot />
  </div>
</template>
<script setup>
defineOptions({ name: 'AuthLayout' })
</script>

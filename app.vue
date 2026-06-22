<template>
  <NuxtLayout>
    <NuxtPage keepalive />
  </NuxtLayout>
  <ClientOnly><ToastContainer /></ClientOnly>
  <ClientOnly><TicketChatWidget /></ClientOnly>
</template>

<script setup lang="ts">
useHead({
  link: [{ rel: 'preconnect', href: 'https://fonts.googleapis.com' }, { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' }]
})
</script>

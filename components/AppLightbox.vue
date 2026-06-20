<template>
  <Teleport to="body">
    <Transition name="lb">
      <div
        v-if="lb.isOpen.value"
        class="fixed inset-0 bg-black/92 z-[9999] flex flex-col items-center justify-center"
        @click.self="lb.close()"
        @keydown.esc.window="lb.close()"
        @keydown.arrow-left.window="lb.prev()"
        @keydown.arrow-right.window="lb.next()"
      >
        <!-- Close -->
        <button
          @click="lb.close()"
          class="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>

        <!-- Prev -->
        <button
          v-if="lb.images.value.length > 1"
          @click="lb.prev()"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Image -->
        <div class="flex-1 flex items-center justify-center w-full px-16 py-8 min-h-0">
          <img
            :src="currentImage?.url"
            :alt="currentImage?.name"
            class="max-w-full max-h-full object-contain rounded shadow-2xl select-none"
            draggable="false"
          />
        </div>

        <!-- Next -->
        <button
          v-if="lb.images.value.length > 1"
          @click="lb.next()"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Footer: filename + counter -->
        <div class="pb-4 text-center shrink-0">
          <p class="text-white/80 text-sm">{{ currentImage?.name }}</p>
          <p v-if="lb.images.value.length > 1" class="text-white/40 text-xs mt-0.5">
            {{ lb.index.value + 1 }} / {{ lb.images.value.length }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const lb = useLightbox()
const currentImage = computed(() => lb.images.value[lb.index.value] || null)
</script>

<style scoped>
.lb-enter-active, .lb-leave-active { transition: opacity 0.15s; }
.lb-enter-from, .lb-leave-to { opacity: 0; }
</style>

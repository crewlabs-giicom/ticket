<template>
  <Teleport to="body">
    <Transition name="lb">
      <div
        v-if="lb.isOpen.value"
        class="fixed inset-0 bg-black/95 z-[9999] flex flex-col"
        @keydown.esc.window="lb.close()"
        @keydown.arrow-left.window="lb.prev()"
        @keydown.arrow-right.window="lb.next()"
      >
        <!-- Top toolbar: filename + download + close -->
        <div class="flex items-center justify-between px-4 py-3 shrink-0 bg-black/40">
          <p class="text-white text-sm font-medium truncate max-w-xs">{{ currentImage?.name }}</p>
          <div class="flex items-center gap-2 ml-4 shrink-0">
            <p v-if="lb.images.value.length > 1" class="text-white/50 text-xs">
              {{ lb.index.value + 1 }} / {{ lb.images.value.length }}
            </p>
            <a
              :href="currentImage?.url"
              :download="currentImage?.name"
              class="inline-flex items-center gap-1.5 text-sm text-white bg-white/20 hover:bg-white/40 rounded-lg px-3 py-1.5 transition font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/>
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
              </svg>
              Download
            </a>
            <button
              @click="lb.close()"
              class="inline-flex items-center gap-1 text-sm text-white bg-white/20 hover:bg-red-500 rounded-lg px-3 py-1.5 transition font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
              Tutup
            </button>
          </div>
        </div>

        <!-- Image area -->
        <div class="flex-1 flex items-center justify-center relative min-h-0 px-16 py-4" @click="lb.close()">
          <button
            v-if="lb.images.value.length > 1"
            @click.stop="lb.prev()"
            class="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 rounded-full p-3 transition z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/>
            </svg>
          </button>

          <img
            :src="currentImage?.url"
            :alt="currentImage?.name"
            class="max-w-full max-h-full object-contain rounded shadow-2xl select-none"
            draggable="false"
            @click.stop
          />

          <button
            v-if="lb.images.value.length > 1"
            @click.stop="lb.next()"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 rounded-full p-3 transition z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
            </svg>
          </button>
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

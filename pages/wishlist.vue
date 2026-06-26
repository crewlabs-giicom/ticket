<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Catatan</h1>
        <p class="text-sm text-slate-500 mt-0.5">{{ store.notes.length }} catatan · {{ store.totalUnchecked }} item belum selesai</p>
      </div>
      <button
        @click="store.createNote()"
        class="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-sm px-4 py-2 rounded-xl shadow-sm transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Note Baru
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <svg class="w-6 h-6 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.notes.length" class="text-center py-20">
      <div class="text-6xl mb-4">📝</div>
      <p class="text-slate-500 text-sm">Belum ada catatan</p>
      <button @click="store.createNote()" class="mt-3 text-sm text-yellow-600 hover:underline font-medium">Buat catatan pertama</button>
    </div>

    <!-- Notes grid -->
    <div v-else class="flex flex-wrap gap-4">
      <WishlistNoteCard
        v-for="note in store.notes"
        :key="note.id"
        :note="note"
      />
    </div>

    <!-- Ticket modal -->
    <WishlistPageTicketModal v-if="store.showTicketModal" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const store = useWishlistStore()
onMounted(async () => {
  if (!store.notes.length) await store.fetchNotes()
})
</script>

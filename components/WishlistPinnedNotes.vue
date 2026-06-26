<template>
  <Teleport to="body">
    <WishlistPinnedNote
      v-for="(note, idx) in store.pinnedNotes"
      :key="note.id"
      :note="note"
      :mobile-offset="mobileOffsets[idx]"
    />
  </Teleport>
</template>

<script setup lang="ts">
const store = useWishlistStore()

// Stack pinned notes on mobile: each one sits above the previous
// Minimized bar height ≈ 48px, expanded varies — use fixed 48px per minimized item
const mobileOffsets = computed(() => {
  const offsets: number[] = []
  let acc = 0
  for (const note of store.pinnedNotes) {
    offsets.push(acc)
    // minimized bar ~48px; expanded adds ~200px more but we only stack minimized heights here
    acc += note.is_minimized ? 48 : 48 // simpler: always stack by minimized bar height so they peek
  }
  return offsets
})
</script>

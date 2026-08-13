<template>
  <div class="relative group">
    <pre class="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words">{{ code }}</pre>
    <button
      @click="copy"
      class="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
    >
      {{ copied ? 'Tersalin!' : 'Salin' }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ code: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard API unavailable, ignore
  }
}
</script>

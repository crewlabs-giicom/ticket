<template>
  <div ref="container" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      :disabled="disabled"
      @click="toggle"
      :class="[
        'input text-left flex items-center justify-between gap-2 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
    >
      <span class="truncate flex-1 text-sm" :class="selectedLabels.length ? 'text-slate-900' : 'text-slate-400'">
        {{ selectedLabels.length ? selectedLabels.join(', ') : placeholder }}
      </span>
      <span v-if="selectedLabels.length" class="flex-shrink-0 text-[10px] bg-primary-100 text-primary-700 font-semibold rounded-full px-1.5 py-0.5">
        {{ modelValue.length }}
      </span>
      <svg class="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform" :class="open && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute z-50 mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
    >
      <!-- Search -->
      <div class="p-2 border-b border-slate-100">
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 placeholder-slate-400"
          placeholder="Cari..."
        />
      </div>

      <!-- Quick actions -->
      <div class="flex items-center gap-3 px-3 py-1.5 border-b border-slate-50 bg-slate-50">
        <button type="button" @click="selectAll" class="text-xs text-primary-600 hover:underline">Semua</button>
        <button type="button" @click="clearAll" class="text-xs text-slate-500 hover:underline">Reset</button>
      </div>

      <!-- Options -->
      <ul class="max-h-52 overflow-y-auto py-1">
        <li v-if="!filteredOptions.length" class="px-3 py-2 text-xs text-slate-400 text-center">Tidak ada hasil</li>
        <li
          v-for="opt in filteredOptions"
          :key="String(opt.value)"
          @click="toggle(opt)"
          class="px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors hover:bg-slate-50"
        >
          <span
            :class="[
              'w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors',
              isSelected(opt.value) ? 'bg-primary-500 border-primary-500' : 'border-slate-300',
            ]"
          >
            <svg v-if="isSelected(opt.value)" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span :class="isSelected(opt.value) ? 'text-slate-900 font-medium' : 'text-slate-700'">{{ opt.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type SelectOption = { value: any; label: string }

const props = withDefaults(defineProps<{
  modelValue: any[]
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Pilih...',
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: any[]] }>()

const container = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')

const filteredOptions = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

const selectedLabels = computed(() =>
  props.options.filter(o => props.modelValue.some(v => String(v) === String(o.value))).map(o => o.label)
)

function isSelected(val: any) {
  return props.modelValue.some(v => String(v) === String(val))
}

function toggle(opt?: SelectOption) {
  if (!opt) {
    // called without arg = button click
    if (props.disabled) return
    open.value ? closeDropdown() : openDropdown()
    return
  }
  const cur = [...props.modelValue]
  const idx = cur.findIndex(v => String(v) === String(opt.value))
  if (idx === -1) cur.push(opt.value)
  else cur.splice(idx, 1)
  emit('update:modelValue', cur)
}

function selectAll() {
  emit('update:modelValue', props.options.map(o => o.value))
}

function clearAll() {
  emit('update:modelValue', [])
}

function openDropdown() {
  open.value = true
  query.value = ''
  nextTick(() => searchInput.value?.focus())
}

function closeDropdown() {
  open.value = false
  query.value = ''
}

onClickOutside(container, closeDropdown)
</script>

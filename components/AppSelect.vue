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
      <span :class="selectedLabel ? 'text-slate-900' : 'text-slate-400'" class="truncate flex-1">
        {{ selectedLabel || placeholder }}
      </span>
      <svg class="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform" :class="open && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-slate-100">
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 placeholder-slate-400"
          placeholder="Cari..."
          @keydown.down.prevent="moveHighlight(1)"
          @keydown.up.prevent="moveHighlight(-1)"
          @keydown.enter.prevent="selectHighlighted"
          @keydown.esc="close"
        />
      </div>

      <!-- Options list -->
      <ul class="max-h-52 overflow-y-auto py-1">
        <li v-if="!filteredSelectables.length" class="px-3 py-2 text-xs text-slate-400 text-center">Tidak ada hasil</li>
        <template v-for="(opt, i) in filtered" :key="isGroup(opt) ? `g-${opt.group}` : String(opt.value)">
          <!-- Group header -->
          <li
            v-if="isGroup(opt)"
            class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 select-none"
          >
            {{ opt.group }}
          </li>
          <!-- Selectable option -->
          <li
            v-else
            @click="select(opt)"
            @mouseenter="highlighted = selectableIndex(i)"
            :class="[
              'px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors',
              highlighted === selectableIndex(i) ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50',
              String(opt.value) === String(modelValue) && highlighted !== selectableIndex(i) && 'font-medium',
            ]"
          >
            <svg v-if="String(opt.value) === String(modelValue)" class="w-3.5 h-3.5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else class="w-3.5 flex-shrink-0" />
            {{ opt.label }}
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type GroupHeader = { group: string }
type SelectOption = { value: any; label: string }
type AnyOption = GroupHeader | SelectOption

const props = withDefaults(defineProps<{
  modelValue: any
  options: AnyOption[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Pilih...',
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: any] }>()

const container = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const highlighted = ref(0)

function isGroup(opt: AnyOption): opt is GroupHeader {
  return 'group' in opt
}

const selectedLabel = computed(() => {
  for (const opt of props.options) {
    if (!isGroup(opt) && String(opt.value) === String(props.modelValue)) return opt.label
  }
  return ''
})

const filtered = computed((): AnyOption[] => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.options
  const result: AnyOption[] = []
  let pendingGroup: GroupHeader | null = null
  for (const opt of props.options) {
    if (isGroup(opt)) {
      pendingGroup = opt
    } else if (opt.label.toLowerCase().includes(q)) {
      if (pendingGroup) { result.push(pendingGroup); pendingGroup = null }
      result.push(opt)
    }
  }
  return result
})

const filteredSelectables = computed(() => filtered.value.filter(o => !isGroup(o)) as SelectOption[])

function selectableIndex(rawIndex: number): number {
  let count = 0
  for (let i = 0; i < rawIndex; i++) {
    if (!isGroup(filtered.value[i])) count++
  }
  return count
}

function toggle() {
  if (props.disabled) return
  open.value ? close() : openDropdown()
}

function openDropdown() {
  open.value = true
  query.value = ''
  highlighted.value = 0
  nextTick(() => searchInput.value?.focus())
}

function close() {
  open.value = false
  query.value = ''
}

function select(opt: SelectOption) {
  emit('update:modelValue', opt.value)
  close()
}

function moveHighlight(dir: 1 | -1) {
  const len = filteredSelectables.value.length
  if (!len) return
  highlighted.value = (highlighted.value + dir + len) % len
}

function selectHighlighted() {
  const opt = filteredSelectables.value[highlighted.value]
  if (opt) select(opt)
}

onClickOutside(container, close)
</script>

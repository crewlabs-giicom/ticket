<template>
  <div class="max-w-2xl space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">{{ t('master.projects.subtitle') }}</p>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refresh()" />
        <button @click="openForm()" class="btn-primary">+ {{ t('master.projects.addProject') }}</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <ClientOnly>
      <draggable v-model="sortable" handle=".drag-handle" item-key="id" @end="saveOrder" class="divide-y divide-slate-100">
        <template #item="{ element: p }">
          <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <button class="drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0" :title="t('master.projects.dragToReorder')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
            </button>
            <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-900">{{ p.name }}</p>
              <p class="text-xs text-slate-400">{{ p.description || t('master.projects.noDescription') }} · {{ p.ticket_count }} {{ t('master.projects.ticketsCount') }}</p>
            </div>
            <span :class="['badge text-xs', p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">{{ p.is_active ? t('master.projects.active') : t('master.projects.inactive') }}</span>
            <button @click="openForm(p)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
          </div>
        </template>
      </draggable>
      </ClientOnly>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('common.edit') : t('common.add') }} Project</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('master.projects.projectName') }}</label><input v-model="form.name" class="input" :placeholder="t('master.projects.projectName')" /></div>
          <div><label class="label">{{ t('projects.description') }}</label><textarea v-model="form.description" class="input min-h-[80px] resize-none" :placeholder="t('master.projects.shortDescription')" /></div>
          <div v-if="editing">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="w-4 h-4 rounded" />
              <span class="text-sm text-slate-700">{{ t('master.projects.activeProject') }}</span>
            </label>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="save" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const draggable = defineAsyncComponent(() => import('vuedraggable'))
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()

const { data, refresh, pending } = await useFetch('/api/projects')
const projects = computed(() => (data.value as any)?.data || [])

const sortable = ref<any[]>([])
watch(projects, v => { sortable.value = [...v] }, { immediate: true })

async function saveOrder() {
  await $fetch('/api/projects', {
    method: 'PUT',
    body: sortable.value.map((p, i) => ({ id: p.id, sort_order: i }))
  })
}

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', description: '', is_active: true })

function openForm(p?: any) {
  editing.value = p || null
  if (p) { form.name = p.name; form.description = p.description || ''; form.is_active = !!p.is_active }
  else { form.name = ''; form.description = ''; form.is_active = true }
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/projects/${editing.value.id}`, { method: 'PUT', body: { name: form.name, description: form.description, is_active: form.is_active ? 1 : 0 } })
  } else {
    await $fetch('/api/projects', { method: 'POST', body: { name: form.name, description: form.description } })
  }
  showForm.value = false
  await refresh()
  sortable.value = [...projects.value]
}
</script>

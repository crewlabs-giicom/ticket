<template>
  <div class="max-w-2xl space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Atur priority dan konfigurasi SLA</p>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refresh()" />
        <button @click="openForm()" class="btn-primary">+ Tambah Priority</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <draggable v-model="list" item-key="id" handle=".drag-handle" @end="saveOrder" class="divide-y divide-slate-100">
        <template #item="{ element: p }">
          <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <div class="drag-handle cursor-grab text-slate-300 hover:text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" /></svg>
            </div>
            <div class="w-4 h-4 rounded-full flex-shrink-0 border border-white shadow-sm" :style="{ background: p.color }" />
            <div class="flex-1">
              <span class="text-sm font-medium text-slate-900">{{ p.name }}</span>
              <span class="ml-2 text-xs text-slate-400">SLA: {{ p.sla_hours }}j</span>
            </div>
            <button @click="openForm(p)" class="btn-ghost py-1 px-2 text-xs">Edit</button>
            <button @click="deletePriority(p.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
          </div>
        </template>
      </draggable>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} Priority</h3>
        <div class="space-y-4">
          <div><label class="label">Nama</label><input v-model="form.name" class="input" placeholder="cth: Critical" /></div>
          <div>
            <label class="label">Warna</label>
            <div class="flex items-center gap-3">
              <input type="color" v-model="form.color" class="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
              <input v-model="form.color" class="input flex-1 font-mono text-sm" placeholder="#ef4444" />
            </div>
            <div class="flex gap-2 mt-2 flex-wrap">
              <button v-for="c in presetColors" :key="c" @click="form.color = c" class="w-6 h-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110" :style="{ background: c }" />
            </div>
          </div>
          <div><label class="label">SLA (jam)</label><input v-model.number="form.sla_hours" type="number" min="1" class="input" placeholder="24" /></div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary flex-1">Batal</button>
          <button @click="save" class="btn-primary flex-1">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import draggable from 'vuedraggable'
definePageMeta({ middleware: 'auth' })
const { data, refresh, pending } = await useFetch('/api/priorities')
const list = ref<any[]>([])
watch(data, (v) => { list.value = [...((v as any)?.data || [])] }, { immediate: true })
const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', color: '#6366f1', sla_hours: 24 })
const presetColors = ['#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6','#6366f1','#a855f7','#ec4899','#64748b']
function openForm(p?: any) {
  editing.value = p || null
  if (p) { form.name = p.name; form.color = p.color; form.sla_hours = p.sla_hours }
  else { form.name = ''; form.color = '#6366f1'; form.sla_hours = 24 }
  showForm.value = true
}
async function save() {
  if (editing.value) await $fetch(`/api/priorities/${editing.value.id}`, { method: 'PUT', body: { ...form, order_index: editing.value.order_index } })
  else await $fetch('/api/priorities', { method: 'POST', body: form })
  showForm.value = false; await refresh(); list.value = [...((data.value as any)?.data || [])]
}
async function saveOrder() {
  const items = list.value.map((p, i) => ({ id: p.id, order_index: i + 1 }))
  await $fetch('/api/priorities', { method: 'PUT', body: items })
}
const { confirmDelete } = useConfirm()
async function deletePriority(id: number) {
  if (!await confirmDelete()) return
  await $fetch(`/api/priorities/${id}`, { method: 'DELETE' })
  await refresh(); list.value = [...((data.value as any)?.data || [])]
}
</script>

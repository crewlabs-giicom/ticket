<template>
  <div class="max-w-2xl space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Atur menu navigasi dan hak akses per role</p>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refresh()" />
        <button @click="openForm()" class="btn-primary">+ Tambah Menu</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <ClientOnly>
      <draggable v-model="list" item-key="id" handle=".drag-handle" @end="saveOrder" class="divide-y divide-slate-100">
        <template #item="{ element: m }">
          <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <div class="drag-handle cursor-grab text-slate-300 hover:text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" /></svg>
            </div>
            <div class="flex-1">
              <span class="text-sm font-medium text-slate-900">{{ m.name }}</span>
              <span class="ml-2 text-xs text-slate-400">{{ m.path }}</span>
            </div>
            <span :class="['badge text-xs', m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">{{ m.role }}</span>
            <span :class="['badge text-xs ml-1', m.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">{{ m.is_active ? 'Aktif' : 'Off' }}</span>
            <button @click="openForm(m)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
            <button @click="deleteMenu(m.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
          </div>
        </template>
      </draggable>
      </ClientOnly>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} Menu</h3>
        <div class="space-y-4">
          <div><label class="label">Nama</label><input v-model="form.name" class="input" placeholder="Nama menu" /></div>
          <div><label class="label">Path</label><input v-model="form.path" class="input" placeholder="/tickets" /></div>
          <div><label class="label">Icon (nama)</label><input v-model="form.icon" class="input" placeholder="ticket" /></div>
          <div><label class="label">Akses Role</label>
            <AppSelect
              v-model="form.role"
              :options="[
                { value: 'all', label: 'Semua (all)' },
                { value: 'admin', label: 'Admin saja' },
                { value: 'staff', label: 'Staff & Admin' },
                { value: 'customer', label: 'Customer saja' },
              ]"
              placeholder="Role"
            />
          </div>
          <div v-if="editing">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="w-4 h-4 rounded" />
              <span class="text-sm text-slate-700">Tampilkan menu</span>
            </label>
          </div>
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
const draggable = defineAsyncComponent(() => import('vuedraggable'))
definePageMeta({ middleware: 'auth' })

const { data: allMenus, refresh, pending } = await useFetch('/api/menus')
const list = ref<any[]>([])
watch(allMenus, (v) => { list.value = [...((v as any)?.data || [])] }, { immediate: true })

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', path: '', icon: 'ticket', role: 'all', is_active: true })

function openForm(m?: any) {
  editing.value = m || null
  if (m) { form.name = m.name; form.path = m.path; form.icon = m.icon; form.role = m.role; form.is_active = !!m.is_active }
  else { form.name = ''; form.path = ''; form.icon = 'ticket'; form.role = 'all'; form.is_active = true }
  showForm.value = true
}

async function save() {
  const body = { name: form.name, path: form.path, icon: form.icon, role: form.role, is_active: form.is_active ? 1 : 0, order_index: editing.value?.order_index ?? 99 }
  if (editing.value) await $fetch(`/api/menus/${editing.value.id}`, { method: 'PUT', body })
  else await $fetch('/api/menus', { method: 'POST', body })
  showForm.value = false
  await refresh()
  list.value = [...((allMenus.value as any)?.data || [])]
}

async function saveOrder() {
  const items = list.value.map((m, i) => ({ id: m.id, order_index: i + 1 }))
  await $fetch('/api/menus', { method: 'PUT', body: items })
}

const { confirmDelete } = useConfirm()
async function deleteMenu(id: number) {
  if (!await confirmDelete()) return
  await $fetch(`/api/menus/${id}`, { method: 'DELETE' })
  await refresh()
  list.value = [...((allMenus.value as any)?.data || [])]
}
</script>

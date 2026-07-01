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
        <!-- Top-level draggable -->
        <draggable v-model="topLevelList" item-key="id" handle=".drag-handle" @end="saveOrder" class="divide-y divide-slate-100">
          <template #item="{ element: m }">
            <div>
              <!-- Parent / folder row -->
              <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div class="drag-handle cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
                </div>
                <div class="w-4 flex-shrink-0">
                  <svg v-if="!m.path" class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <svg v-else class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                </div>
                <div class="flex-1">
                  <span class="text-sm font-medium text-slate-900">{{ m.name }}</span>
                  <span class="ml-2 text-xs text-slate-400">{{ m.path || '(folder)' }}</span>
                </div>
                <span :class="['badge text-xs', m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">{{ m.role }}</span>
                <span :class="['badge text-xs ml-1', m.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">{{ m.is_active ? 'Aktif' : 'Off' }}</span>
                <button @click="openForm(m)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
                <button @click="deleteMenu(m.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
              </div>

              <!-- Children draggable (per parent) -->
              <draggable
                v-if="childrenOf(m.id).length"
                :model-value="childrenOf(m.id)"
                @update:model-value="(val: any[]) => updateChildren(m.id, val)"
                item-key="id"
                handle=".drag-handle"
                @end="saveOrder"
                class="divide-y divide-slate-100 bg-slate-50/40"
              >
                <template #item="{ element: c }">
                  <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div class="drag-handle cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0 ml-4">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
                    </div>
                    <span class="text-slate-300 text-xs">└</span>
                    <div class="flex-1">
                      <span class="text-sm text-slate-800">{{ c.name }}</span>
                      <span class="ml-2 text-xs text-slate-400">{{ c.path }}</span>
                    </div>
                    <span :class="['badge text-xs', c.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">{{ c.role }}</span>
                    <span :class="['badge text-xs ml-1', c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">{{ c.is_active ? 'Aktif' : 'Off' }}</span>
                    <button @click="openForm(c)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
                    <button @click="deleteMenu(c.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
                  </div>
                </template>
              </draggable>
            </div>
          </template>
        </draggable>

        <!-- Orphaned children -->
        <div v-for="m in orphans" :key="m.id" class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-l-2 border-orange-200 border-t border-slate-100">
          <div class="flex-1">
            <span class="text-sm font-medium text-slate-900">{{ m.name }}</span>
            <span class="ml-2 text-xs text-slate-400">{{ m.path }}</span>
            <span class="ml-2 text-xs text-orange-400">(parent tidak ditemukan)</span>
          </div>
          <button @click="openForm(m)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
          <button @click="deleteMenu(m.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
        </div>

        <div v-if="!list.length" class="px-4 py-8 text-center text-slate-400 text-sm">Belum ada menu</div>
      </ClientOnly>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} Menu</h3>
        <div class="space-y-4">
          <div>
            <label class="label">Nama</label>
            <input v-model="form.name" class="input" placeholder="Nama menu" />
          </div>
          <div>
            <label class="label">Path <span class="text-slate-400 font-normal text-xs">(kosongkan jika folder group)</span></label>
            <input v-model="form.path" class="input" placeholder="/tickets" />
          </div>
          <div>
            <label class="label">Icon</label>
            <input v-model="form.icon" class="input" placeholder="ticket" />
          </div>
          <div>
            <label class="label">Parent Group <span class="text-slate-400 font-normal text-xs">(opsional)</span></label>
            <AppSelect
              v-model="form.parent_id"
              :options="[{ value: '', label: '— Top level (tidak ada parent) —' }, ...folderOptions]"
              placeholder="Pilih parent..."
            />
          </div>
          <div>
            <label class="label">Akses Role</label>
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

// Tree structure
const topLevelList = computed({
  get: () => list.value.filter(m => !m.parent_id).sort((a, b) => a.order_index - b.order_index),
  set: (val: any[]) => {
    val.forEach((m, i) => {
      const item = list.value.find(x => x.id === m.id)
      if (item) item.order_index = i + 1
    })
  }
})
const childrenOf = (parentId: number) => list.value.filter(m => m.parent_id === parentId).sort((a: any, b: any) => a.order_index - b.order_index)
function updateChildren(parentId: number, val: any[]) {
  val.forEach((m, i) => {
    const item = list.value.find(x => x.id === m.id)
    if (item) item.order_index = i + 1
  })
}
const parentIds = computed(() => new Set(list.value.filter(m => !m.parent_id).map(m => m.id)))
const orphans = computed(() => list.value.filter(m => m.parent_id && !parentIds.value.has(m.parent_id)))

// Folder options = top-level items with no path (pure folder) OR top-level items that others can be nested under
const folderOptions = computed(() =>
  list.value
    .filter(m => !m.parent_id)
    .map((m: any) => ({ value: m.id, label: m.name + (m.path ? ` (${m.path})` : ' [folder]') }))
)

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', path: '', icon: 'ticket', role: 'all', is_active: true, parent_id: '' as any })

function openForm(m?: any) {
  editing.value = m || null
  if (m) {
    form.name = m.name
    form.path = m.path || ''
    form.icon = m.icon
    form.role = m.role
    form.is_active = !!m.is_active
    form.parent_id = m.parent_id || ''
  } else {
    form.name = ''; form.path = ''; form.icon = 'ticket'; form.role = 'all'; form.is_active = true; form.parent_id = ''
  }
  showForm.value = true
}

async function saveOrder() {
  const items = list.value.map((m: any) => ({ id: m.id, order_index: m.order_index }))
  await $fetch('/api/menus', { method: 'PUT', body: items })
}

async function save() {
  const body = {
    name: form.name,
    path: form.path || null,
    icon: form.icon,
    role: form.role,
    is_active: form.is_active ? 1 : 0,
    order_index: editing.value?.order_index ?? 99,
    parent_id: form.parent_id || null,
  }
  if (editing.value) await $fetch(`/api/menus/${editing.value.id}`, { method: 'PUT', body })
  else await $fetch('/api/menus', { method: 'POST', body })
  showForm.value = false
  await refresh()
  list.value = [...((allMenus.value as any)?.data || [])]
}

const { confirmDelete } = useConfirm()
async function deleteMenu(id: number) {
  if (!await confirmDelete()) return
  await $fetch(`/api/menus/${id}`, { method: 'DELETE' })
  await refresh()
  list.value = [...((allMenus.value as any)?.data || [])]
}
</script>

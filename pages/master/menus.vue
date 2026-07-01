<template>
  <div class="max-w-2xl space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Atur menu navigasi dan hak akses per role</p>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refresh()" />
        <button @click="openForm()" class="btn-primary">+ Tambah Menu</button>
      </div>
    </div>

    <div class="card overflow-hidden divide-y divide-slate-100">
      <!-- Top-level items (no parent) -->
      <template v-for="m in topLevel" :key="m.id">
        <!-- Parent / folder row -->
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group">
          <div class="w-4 flex-shrink-0 text-slate-300">
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

        <!-- Children rows -->
        <div v-for="c in childrenOf(m.id)" :key="c.id" class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 bg-slate-50/50">
          <div class="w-4 flex-shrink-0 flex items-center">
            <span class="text-slate-300 text-xs pl-3">└</span>
          </div>
          <div class="flex-1 pl-2">
            <span class="text-sm text-slate-800">{{ c.name }}</span>
            <span class="ml-2 text-xs text-slate-400">{{ c.path }}</span>
          </div>
          <span :class="['badge text-xs', c.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">{{ c.role }}</span>
          <span :class="['badge text-xs ml-1', c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500']">{{ c.is_active ? 'Aktif' : 'Off' }}</span>
          <button @click="openForm(c)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
          <button @click="deleteMenu(c.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
        </div>
      </template>

      <!-- Orphaned children (parent deleted) -->
      <template v-for="m in orphans" :key="m.id">
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-l-2 border-orange-200">
          <div class="flex-1">
            <span class="text-sm font-medium text-slate-900">{{ m.name }}</span>
            <span class="ml-2 text-xs text-slate-400">{{ m.path }}</span>
            <span class="ml-2 text-xs text-orange-400">(parent tidak ditemukan)</span>
          </div>
          <button @click="openForm(m)" class="btn-ghost py-1 px-2 text-xs ml-1">Edit</button>
          <button @click="deleteMenu(m.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
        </div>
      </template>

      <div v-if="!list.length" class="px-4 py-8 text-center text-slate-400 text-sm">Belum ada menu</div>
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
definePageMeta({ middleware: 'auth' })

const { data: allMenus, refresh, pending } = await useFetch('/api/menus')
const list = ref<any[]>([])
watch(allMenus, (v) => { list.value = [...((v as any)?.data || [])] }, { immediate: true })

// Tree structure
const topLevel = computed(() => list.value.filter(m => !m.parent_id).sort((a, b) => a.order_index - b.order_index))
const childrenOf = (parentId: number) => list.value.filter(m => m.parent_id === parentId).sort((a: any, b: any) => a.order_index - b.order_index)
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

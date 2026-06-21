<template>
  <div class="max-w-3xl space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Daftar modul dan menu dalam sistem</p>
      <button @click="openForm()" class="btn-primary">+ Tambah Menu</button>
    </div>

    <div v-if="!list.length" class="card p-8 text-center text-sm text-slate-400">Belum ada data. Tambah modul atau menu sistem.</div>

    <!-- Grouped by module -->
    <div v-for="(items, module) in grouped" :key="module" class="card overflow-hidden">
      <div class="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        <span class="text-sm font-semibold text-slate-700">{{ module }}</span>
        <span class="text-xs text-slate-400">({{ items.length }} item)</span>
      </div>
      <div class="divide-y divide-slate-100">
        <div v-for="item in items" :key="item.id" class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
          <div class="flex-1 flex items-center gap-2 flex-wrap">
            <span v-if="item.type" class="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded"
              :class="{
                'bg-blue-100 text-blue-700': item.type === 'master',
                'bg-green-100 text-green-700': item.type === 'transaction',
                'bg-purple-100 text-purple-700': item.type === 'report',
              }">{{ item.type }}</span>
            <span v-else class="text-[10px] text-slate-400 italic">module</span>
            <span class="text-sm text-slate-800">{{ item.name || '—' }}</span>
            <span v-if="item.project_name" class="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{{ item.project_name }}</span>
          </div>
          <span v-if="!item.is_active" class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">nonaktif</span>
          <button @click="openForm(item)" class="btn-ghost py-1 px-2 text-xs">Edit</button>
          <button @click="deleteItem(item.id)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} Menu Sistem</h3>
        <div class="space-y-4">
          <div>
            <label class="label">Project <span class="text-slate-400 text-xs">(opsional)</span></label>
            <AppSelect
              v-model="form.project_id"
              :options="[{ value: '', label: '— Semua Project (Global) —' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
              placeholder="— Semua Project (Global) —"
            />
          </div>
          <div>
            <label class="label">Modul <span class="text-red-500">*</span></label>
            <input v-model="form.module" list="module-list" class="input" placeholder="cth: Backbone" />
            <datalist id="module-list">
              <option v-for="m in modules" :key="m" :value="m" />
            </datalist>
          </div>
          <div>
            <label class="label">Jenis</label>
            <AppSelect
              v-model="form.type"
              :options="[
                { value: '', label: '— Modul saja (tanpa jenis) —' },
                { value: 'master', label: 'Master' },
                { value: 'transaction', label: 'Transaction' },
                { value: 'report', label: 'Report' },
              ]"
              placeholder="— Modul saja —"
            />
          </div>
          <div>
            <label class="label">Nama Menu</label>
            <input v-model="form.name" class="input" :disabled="!form.type" placeholder="cth: Customer List" />
            <p v-if="!form.type" class="text-[11px] text-slate-400 mt-1">Pilih jenis terlebih dahulu untuk mengisi nama.</p>
          </div>
          <div v-if="editing" class="flex items-center gap-2">
            <input type="checkbox" v-model="form.is_active" id="chk-active" class="w-4 h-4 rounded" />
            <label for="chk-active" class="text-sm text-slate-700">Aktif</label>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary flex-1">Batal</button>
          <button @click="save" :disabled="!form.module.trim()" class="btn-primary flex-1">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data, refresh } = await useFetch('/api/system-menus')
const { data: prd } = await useFetch('/api/projects')
const list = ref<any[]>([])
const projects = computed(() => (prd.value as any)?.data?.filter((p: any) => p.is_active) || [])
watch(data, (v) => { list.value = [...((v as any)?.data || [])] }, { immediate: true })

const grouped = computed(() => {
  const g: Record<string, any[]> = {}
  for (const item of list.value) {
    if (!g[item.module]) g[item.module] = []
    g[item.module].push(item)
  }
  return g
})

const modules = computed(() => [...new Set(list.value.map(i => i.module))])

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ module: '', type: '', name: '', is_active: true, project_id: '' as string | number })

function openForm(item?: any) {
  editing.value = item || null
  if (item) {
    form.module = item.module
    form.type = item.type || ''
    form.name = item.name || ''
    form.is_active = !!item.is_active
    form.project_id = item.project_id || ''
  } else {
    form.module = ''
    form.type = ''
    form.name = ''
    form.is_active = true
    form.project_id = ''
  }
  showForm.value = true
}

async function save() {
  const body = {
    module: form.module.trim(),
    type: form.type || null,
    name: form.type ? (form.name.trim() || null) : null,
    is_active: form.is_active ? 1 : 0,
    project_id: form.project_id || null,
  }
  if (editing.value) {
    await $fetch(`/api/system-menus/${editing.value.id}`, { method: 'PUT', body })
  } else {
    await $fetch('/api/system-menus', { method: 'POST', body })
  }
  showForm.value = false
  await refresh()
  list.value = [...((data.value as any)?.data || [])]
}

const { confirmDelete } = useConfirm()
async function deleteItem(id: number) {
  if (!await confirmDelete()) return
  await $fetch(`/api/system-menus/${id}`, { method: 'DELETE' })
  await refresh()
  list.value = [...((data.value as any)?.data || [])]
}
</script>

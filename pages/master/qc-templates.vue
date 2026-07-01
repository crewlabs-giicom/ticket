<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Template QC</h1>
        <p class="text-sm text-slate-500 mt-0.5">Kelola template checklist untuk Quality Control</p>
      </div>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="loading" @click="fetchTemplates" />
        <button @click="openForm()" class="btn-primary">+ Tambah Template</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama Template</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Deskripsi</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dibuat</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td colspan="5" class="text-center py-8 text-slate-400">Memuat...</td></tr>
          <tr v-else-if="!templates.length"><td colspan="5" class="text-center py-8 text-slate-400">Belum ada template QC</td></tr>
          <tr v-for="t in templates" :key="t.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-900">{{ t.name }}</td>
            <td class="px-4 py-3 text-slate-500 hidden md:table-cell">{{ t.description || '—' }}</td>
            <td class="px-4 py-3">
              <span class="badge bg-indigo-50 text-indigo-700 text-xs">{{ t.item_count ?? 0 }} item</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ t.created_by_name }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1">
                <button @click="openForm(t)" class="btn-ghost py-1 px-2 text-xs">Edit</button>
                <button @click="deleteTemplate(t)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">Hapus</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} Template QC</h3>
        <div class="space-y-4">
          <div>
            <label class="label">Nama Template <span class="text-red-500">*</span></label>
            <input v-model="form.name" class="input" placeholder="Contoh: QC Website v1" />
          </div>
          <div>
            <label class="label">Deskripsi</label>
            <textarea v-model="form.description" class="input" rows="2" placeholder="Opsional"></textarea>
          </div>

          <!-- Checklist Items -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="label mb-0">Checklist Items</label>
              <button @click="addItem" class="text-xs text-indigo-600 hover:text-indigo-800">+ Tambah Item</button>
            </div>
            <div class="space-y-2">
              <div v-for="(item, idx) in form.items" :key="idx" class="flex items-center gap-2">
                <input v-model="form.items[idx]" class="input flex-1 text-sm" :placeholder="`Item ${idx + 1}`" />
                <button @click="removeItem(idx)" class="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <button v-if="!form.items.length" @click="addItem" class="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                Klik untuk menambah checklist item
              </button>
            </div>
          </div>
        </div>

        <p v-if="formError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{{ formError }}</p>
        <div class="flex gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary flex-1">Batal</button>
          <button @click="saveTemplate" :disabled="saving" class="btn-primary flex-1">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { $swal } = useNuxtApp() as any

const templates = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const editing = ref<any>(null)

const form = reactive({ name: '', description: '', items: [] as string[] })

async function fetchTemplates() {
  loading.value = true
  try {
    const raw = await $fetch<any[]>('/api/qc-templates')
    // Enrich with item count
    const withCounts = await Promise.all(raw.map(async (t: any) => {
      const items = await $fetch<any[]>(`/api/qc-templates/${t.id}/items`)
      return { ...t, item_count: items.length }
    }))
    templates.value = withCounts
  } finally {
    loading.value = false
  }
}

function openForm(t?: any) {
  editing.value = t || null
  form.name = t?.name || ''
  form.description = t?.description || ''
  form.items = []
  formError.value = ''
  showForm.value = true
  if (t) loadItems(t.id)
}

async function loadItems(id: number) {
  const items = await $fetch<any[]>(`/api/qc-templates/${id}/items`)
  form.items = items.map((i: any) => i.item_name)
}

function addItem() { form.items.push('') }
function removeItem(idx: number) { form.items.splice(idx, 1) }

async function saveTemplate() {
  if (!form.name.trim()) { formError.value = 'Nama template wajib diisi'; return }
  saving.value = true
  formError.value = ''
  try {
    let id: number
    if (editing.value) {
      await $fetch(`/api/qc-templates/${editing.value.id}`, { method: 'PUT', body: { name: form.name, description: form.description } })
      id = editing.value.id
    } else {
      const created = await $fetch<any>('/api/qc-templates', { method: 'POST', body: { name: form.name, description: form.description } })
      id = created.id
    }
    await $fetch(`/api/qc-templates/${id}/items`, { method: 'PUT', body: { items: form.items.filter(i => i.trim()) } })
    showForm.value = false
    await fetchTemplates()
  } catch (e: any) {
    formError.value = e?.data?.message || 'Gagal menyimpan template'
  } finally {
    saving.value = false
  }
}

async function deleteTemplate(t: any) {
  const confirmed = await $swal.fire({
    title: 'Hapus Template?',
    text: `Template "${t.name}" akan dihapus permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
  })
  if (!confirmed.isConfirmed) return
  await $fetch(`/api/qc-templates/${t.id}`, { method: 'DELETE' })
  await fetchTemplates()
}

onMounted(fetchTemplates)
</script>

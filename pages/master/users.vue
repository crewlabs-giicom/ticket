<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Kelola akun pengguna sistem</p>
      <button @click="openForm()" class="btn-primary">+ Tambah User</button>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">{{ u.name?.charAt(0)?.toUpperCase() }}</div>
                <span class="font-medium text-slate-900 text-sm">{{ u.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3 hidden md:table-cell"><span class="text-xs text-slate-500">{{ u.email }}</span></td>
            <td class="px-4 py-3">
              <span :class="['badge text-xs', u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600']">{{ u.role }}</span>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span :class="['badge text-xs', u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">{{ u.is_active ? 'Aktif' : 'Nonaktif' }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1">
                <button @click="openForm(u)" class="btn-ghost py-1 px-2 text-xs">Edit</button>
                <button @click="toggleActive(u)" class="btn-ghost py-1 px-2 text-xs" :class="u.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'">{{ u.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? 'Edit' : 'Tambah' }} User</h3>
        <div class="space-y-4">
          <div><label class="label">Nama</label><input v-model="form.name" class="input" placeholder="Nama lengkap" required /></div>
          <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" placeholder="email@domain.com" required /></div>
          <div><label class="label">Password {{ editing ? '(kosongkan jika tidak diubah)' : '' }}</label><input v-model="form.password" type="password" class="input" :placeholder="editing ? 'Kosongkan jika tidak diubah' : 'Min. 6 karakter'" /></div>
          <div><label class="label">Role</label>
            <select v-model="form.role" class="input">
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
        <p v-if="formError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{{ formError }}</p>
        <div class="flex gap-2 mt-5">
          <button @click="showForm = false" class="btn-secondary flex-1">Batal</button>
          <button @click="save" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data, refresh } = await useFetch('/api/users')
const users = computed(() => (data.value as any)?.data || [])

const showForm = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ name: '', email: '', password: '', role: 'staff' })

function openForm(u?: any) {
  editing.value = u || null
  formError.value = ''
  if (u) { form.name = u.name; form.email = u.email; form.password = ''; form.role = u.role }
  else { form.name = ''; form.email = ''; form.password = ''; form.role = 'staff' }
  showForm.value = true
}

async function save() {
  formError.value = ''
  saving.value = true
  try {
    const body: any = { name: form.name, email: form.email, role: form.role }
    if (form.password) body.password = form.password
    if (editing.value) {
      await $fetch(`/api/users/${editing.value.id}`, { method: 'PUT', body })
    } else {
      if (!form.password) { formError.value = 'Password wajib diisi'; saving.value = false; return }
      await $fetch('/api/users', { method: 'POST', body: { ...body, password: form.password } })
    }
    showForm.value = false
    await refresh()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || 'Gagal menyimpan'
  } finally { saving.value = false }
}

async function toggleActive(u: any) {
  await $fetch(`/api/users/${u.id}`, { method: 'PUT', body: { name: u.name, email: u.email, role: u.role, is_active: u.is_active ? 0 : 1 } })
  await refresh()
}
</script>

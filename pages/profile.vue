<template>
  <div class="max-w-2xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-slate-900">Profil Saya</h1>
        <p class="text-sm text-slate-500 mt-0.5">Kelola informasi akun dan keamanan Anda</p>
      </div>
      <AppRefreshButton :loading="refreshingProfile" @click="handleRefreshProfile" />
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-primary-600">{{ stats?.tickets_created ?? '–' }}</p>
        <p class="text-xs text-slate-500 mt-1">Ticket Dibuat</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-indigo-600">{{ stats?.tickets_assigned ?? '–' }}</p>
        <p class="text-xs text-slate-500 mt-1">Ticket Di-assign</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-emerald-600">{{ stats?.tasks_assigned ?? '–' }}</p>
        <p class="text-xs text-slate-500 mt-1">Task Di-assign</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-amber-600">{{ stats?.projects_involved ?? '–' }}</p>
        <p class="text-xs text-slate-500 mt-1">Project Terlibat</p>
      </div>
    </div>

    <!-- Edit Profil -->
    <div class="card p-6 space-y-5">
      <h2 class="text-sm font-semibold text-slate-900">Edit Profil</h2>

      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <div class="relative group">
          <div class="w-16 h-16 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center flex-shrink-0">
            <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover" />
            <span v-else class="text-primary-700 font-bold text-xl">{{ initials }}</span>
          </div>
          <label class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <input type="file" accept="image/*" class="hidden" :disabled="avatarUploading" @change="handleAvatarUpload" />
          </label>
          <div v-if="avatarUploading" class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-slate-700">Foto Profil</p>
          <p class="text-xs text-slate-400 mt-0.5">Klik foto untuk mengganti. Format: JPG, PNG, WebP. Maks 10MB.</p>
        </div>
      </div>

      <!-- Nama & Email -->
      <div class="space-y-3">
        <div>
          <label class="label">Nama</label>
          <input v-model="profileForm.name" type="text" class="input" placeholder="Nama lengkap" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="profileForm.email" type="email" class="input" placeholder="email@contoh.com" />
        </div>
      </div>

      <p v-if="profileError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ profileError }}</p>
      <p v-if="profileSuccess" class="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{{ profileSuccess }}</p>

      <div class="flex justify-end">
        <button @click="saveProfile" :disabled="profileSaving" class="btn-primary">
          {{ profileSaving ? 'Menyimpan...' : 'Simpan Profil' }}
        </button>
      </div>
    </div>

    <!-- Ganti Password -->
    <div class="card p-6 space-y-4">
      <h2 class="text-sm font-semibold text-slate-900">Ganti Password</h2>
      <div class="space-y-3">
        <div>
          <label class="label">Password Baru</label>
          <input v-model="passForm.password" type="password" class="input" placeholder="Minimal 6 karakter" />
        </div>
        <div>
          <label class="label">Konfirmasi Password Baru</label>
          <input v-model="passForm.confirm" type="password" class="input" placeholder="Ulangi password baru" />
        </div>
      </div>

      <p v-if="passError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ passError }}</p>
      <p v-if="passSuccess" class="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{{ passSuccess }}</p>

      <div class="flex justify-end">
        <button @click="savePassword" :disabled="passSaving" class="btn-primary">
          {{ passSaving ? 'Menyimpan...' : 'Ganti Password' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const user = computed(() => auth.user)

const initials = computed(() =>
  user.value?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
)

// Stats
const { data: statsData, refresh: refreshStats } = await useFetch('/api/profile/stats')
const stats = computed(() => (statsData.value as any)?.data)

const refreshingProfile = ref(false)
async function handleRefreshProfile() {
  refreshingProfile.value = true
  await Promise.all([refreshStats(), auth.fetchMe()])
  refreshingProfile.value = false
}

// Avatar
const avatarPreview = ref<string | null>(user.value?.avatar ? `/uploads/${user.value.avatar}` : null)
const avatarUploading = ref(false)
const currentAvatar = ref<string | null>(user.value?.avatar ?? null)

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarUploading.value = true
  profileError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('menu', 'profile')
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    currentAvatar.value = res.data.filename
    avatarPreview.value = `/uploads/${res.data.filename}`
    // Auto-save avatar immediately
    await $fetch(`/api/users/${user.value.id}`, {
      method: 'PUT',
      body: { name: user.value.name, email: user.value.email, role: user.value.role, is_active: 1, avatar: res.data.filename },
    })
    await auth.fetchMe()
  } catch {
    profileError.value = 'Gagal mengupload foto profil'
  } finally {
    avatarUploading.value = false
  }
}

// Profile form
const profileForm = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
})
const profileSaving = ref(false)
const profileError = ref('')
const profileSuccess = ref('')

async function saveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  if (!profileForm.name.trim() || !profileForm.email.trim()) {
    profileError.value = 'Nama dan email wajib diisi'
    return
  }
  profileSaving.value = true
  try {
    await $fetch(`/api/users/${user.value.id}`, {
      method: 'PUT',
      body: {
        name: profileForm.name,
        email: profileForm.email,
        role: user.value.role,
        is_active: 1,
        avatar: currentAvatar.value,
      },
    })
    await auth.fetchMe()
    profileSuccess.value = 'Profil berhasil diperbarui'
  } catch (err: any) {
    profileError.value = err?.data?.statusMessage || 'Gagal menyimpan profil'
  } finally {
    profileSaving.value = false
  }
}

// Password form
const passForm = reactive({ password: '', confirm: '' })
const passSaving = ref(false)
const passError = ref('')
const passSuccess = ref('')

async function savePassword() {
  passError.value = ''
  passSuccess.value = ''
  if (!passForm.password) {
    passError.value = 'Password baru wajib diisi'
    return
  }
  if (passForm.password.length < 6) {
    passError.value = 'Password minimal 6 karakter'
    return
  }
  if (passForm.password !== passForm.confirm) {
    passError.value = 'Konfirmasi password tidak cocok'
    return
  }
  passSaving.value = true
  try {
    await $fetch(`/api/users/${user.value.id}`, {
      method: 'PUT',
      body: {
        name: user.value.name,
        email: user.value.email,
        role: user.value.role,
        is_active: 1,
        avatar: currentAvatar.value,
        password: passForm.password,
      },
    })
    passForm.password = ''
    passForm.confirm = ''
    passSuccess.value = 'Password berhasil diubah'
  } catch (err: any) {
    passError.value = err?.data?.statusMessage || 'Gagal mengubah password'
  } finally {
    passSaving.value = false
  }
}
</script>

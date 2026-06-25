<template>
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <div class="flex justify-center mb-6">
        <div class="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
      </div>
      <h1 class="text-xl font-bold text-center text-slate-900 mb-1">Welcome</h1>
      <p class="text-sm text-center text-slate-500 mb-6">Masuk ke Shadow Care</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" placeholder="admin@ticketing.com" required />
        </div>
        <div>
          <label class="label">Password</label>
          <div class="relative">
            <input v-model="form.password" :type="showPass ? 'text' : 'password'" class="input pr-10" placeholder="••••••••" required />
            <button type="button" @click="showPass = !showPass" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="showPass ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'" /></svg>
            </button>
          </div>
        </div>
        <p v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</p>
        <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="auth.loading">
          <svg v-if="auth.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {{ auth.loading ? 'Masuk...' : 'Masuk' }}
        </button>
      </form>

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
        <div class="relative flex justify-center"><span class="bg-white px-2 text-xs text-slate-400">atau</span></div>
      </div>

      <button type="button" @click="showHrisForm = !showHrisForm" class="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 8v-3a1 1 0 011-1h2a1 1 0 011 1v3m-4 0h4" /></svg>
        Login via HRIS giisystem
      </button>

      <div v-if="showHrisForm" class="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
        <p class="text-xs text-blue-700 font-medium">Masuk menggunakan akun HRIS giisystem</p>
        <div>
          <label class="label">Email HRIS</label>
          <input v-model="hrisForm.email" type="email" class="input" placeholder="email@giisystem.com" />
        </div>
        <div>
          <label class="label">Password HRIS</label>
          <input v-model="hrisForm.password" type="password" class="input" placeholder="••••••••" />
        </div>
        <p v-if="hrisError" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ hrisError }}</p>
        <button type="button" @click="handleHrisLogin" class="btn-primary w-full justify-center py-2.5" :disabled="hrisLoading">
          <svg v-if="hrisLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {{ hrisLoading ? 'Verifikasi...' : 'Masuk via HRIS' }}
        </button>
      </div>

      <p class="text-center text-sm text-slate-500 mt-4">
        Belum punya akun?
        <NuxtLink to="/register" class="text-primary-600 hover:underline font-medium">Daftar</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const auth = useAuthStore()
const router = useRouter()

if (auth.user) await router.push('/')

const form = reactive({ email: '', password: '' })
const showPass = ref(false)
const error = ref('')

const showHrisForm = ref(false)
const hrisForm = reactive({ email: '', password: '' })
const hrisError = ref('')
const hrisLoading = ref(false)

async function handleLogin() {
  error.value = ''
  try {
    await auth.login(form.email, form.password)
    await router.push('/')
  } catch (e: any) {
    error.value = e.message
  }
}

async function handleHrisLogin() {
  hrisError.value = ''
  if (!hrisForm.email || !hrisForm.password) {
    hrisError.value = 'Email dan password wajib diisi'
    return
  }
  hrisLoading.value = true
  try {
    const data = await $fetch<any>('/api/auth/hris-login', {
      method: 'POST',
      body: { email: hrisForm.email, password: hrisForm.password },
    })
    auth.user = data.user
    await router.push('/')
  } catch (e: any) {
    hrisError.value = e?.data?.statusMessage || 'Akun HRIS tidak ditemukan atau password salah'
  } finally {
    hrisLoading.value = false
  }
}
</script>

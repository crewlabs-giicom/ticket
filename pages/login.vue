<template>
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <div class="flex justify-center mb-6">
        <div class="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
      </div>
      <h1 class="text-xl font-bold text-center text-slate-900 mb-1">Selamat Datang</h1>
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

      <div class="mt-4 pt-4 border-t border-slate-100">
        <p class="text-xs text-center text-slate-400 mb-2">Demo accounts:</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <button v-for="acc in demoAccounts" :key="acc.email" @click="fillDemo(acc)" class="text-left p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <p class="font-medium text-slate-700">{{ acc.label }}</p>
            <p class="text-slate-400 truncate">{{ acc.email }}</p>
          </button>
        </div>
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

const demoAccounts = [
  { label: 'Admin', email: 'admin@ticketing.com', password: 'password123' },
  { label: 'Staff', email: 'budi@ticketing.com', password: 'password123' },
  { label: 'Staff 2', email: 'siti@ticketing.com', password: 'password123' },
  { label: 'Customer', email: 'customer1@example.com', password: 'password123' }
]

function fillDemo(acc: any) {
  form.email = acc.email
  form.password = acc.password
}

async function handleLogin() {
  error.value = ''
  try {
    await auth.login(form.email, form.password)
    await router.push('/')
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <h1 class="text-xl font-bold text-center text-slate-900 mb-1">Daftar Akun</h1>
      <p class="text-sm text-center text-slate-500 mb-6">Buat akun customer baru</p>
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div><label class="label">Nama Lengkap</label><input v-model="form.name" class="input" placeholder="Nama kamu" required /></div>
        <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" placeholder="email@example.com" required /></div>
        <div><label class="label">Password</label><input v-model="form.password" type="password" class="input" placeholder="Min. 6 karakter" required minlength="6" /></div>
        <p v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</p>
        <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">{{ loading ? 'Mendaftar...' : 'Daftar' }}</button>
      </form>
      <p class="text-center text-sm text-slate-500 mt-4">Sudah punya akun? <NuxtLink to="/login" class="text-primary-600 hover:underline font-medium">Masuk</NuxtLink></p>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const form = reactive({ name: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)
const router = useRouter()
async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await router.push('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Pendaftaran gagal'
  } finally { loading.value = false }
}
</script>

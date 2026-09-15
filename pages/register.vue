<template>
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <h1 class="text-xl font-bold text-center text-slate-900 mb-1">{{ t('register.title') }}</h1>
      <p class="text-sm text-center text-slate-500 mb-6">{{ t('register.subtitle') }}</p>
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div><label class="label">{{ t('register.fullName') }}</label><input v-model="form.name" class="input" :placeholder="t('register.yourName')" required /></div>
        <div><label class="label">{{ t('login.email') }}</label><input v-model="form.email" type="email" class="input" placeholder="email@example.com" required /></div>
        <div><label class="label">{{ t('login.password') }}</label><input v-model="form.password" type="password" class="input" :placeholder="t('register.minChars')" required minlength="6" /></div>
        <p v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</p>
        <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">{{ loading ? t('register.registering') : t('register.register') }}</button>
      </form>
      <p class="text-center text-sm text-slate-500 mt-4">{{ t('register.haveAccount') }} <NuxtLink to="/login" class="text-primary-600 hover:underline font-medium">{{ t('login.submit') }}</NuxtLink></p>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
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
    error.value = e?.data?.statusMessage || t('register.failed')
  } finally { loading.value = false }
}
</script>

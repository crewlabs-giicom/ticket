<template>
  <div class="max-w-3xl space-y-4">
    <p class="text-sm text-slate-500">
      Kirim Daily Report otomatis ke grup DingTalk setiap hari pada jam yang ditentukan (WIB), untuk staff yang dipilih.
      Pengiriman manual tersedia di halaman Daily Report.
    </p>

    <form class="card p-5 space-y-4" @submit.prevent="save">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="label">App Key</label>
          <input v-model="form.app_key" class="input" autocomplete="off" />
        </div>
        <div>
          <label class="label">App Secret</label>
          <input v-model="form.app_secret" type="password" class="input" autocomplete="new-password"
            :placeholder="hasSecret ? '•••••••• (kosongkan jika tidak diubah)' : ''" />
        </div>
        <div>
          <label class="label">Robot Code</label>
          <input v-model="form.robot_code" class="input" autocomplete="off" />
        </div>
        <div>
          <label class="label">Open Conversation ID</label>
          <input v-model="form.open_conversation_id" class="input" autocomplete="off" />
        </div>
        <div>
          <label class="label">Jam kirim otomatis (WIB)</label>
          <input v-model="form.send_time" type="time" class="input" required />
        </div>
        <div class="flex items-end pb-2">
          <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input v-model="form.enabled" type="checkbox" class="rounded border-slate-300" />
            Aktifkan pengiriman otomatis
          </label>
        </div>
      </div>

      <div>
        <label class="label">Staff yang dilaporkan</label>
        <AppMultiSelect
          v-model="form.staff_user_ids"
          :options="staffUsers.map((u: any) => ({ value: u.id, label: u.name }))"
          placeholder="Pilih staff"
        />
      </div>

      <div class="flex items-center gap-2 pt-1">
        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Menyimpan…' : 'Simpan' }}</button>
        <button type="button" class="btn-ghost" :disabled="testing" @click="sendTest">{{ testing ? 'Mengirim…' : 'Tes kirim' }}</button>
        <span v-if="lastSent" class="ml-auto text-xs text-slate-400">Terakhir otomatis terkirim: {{ lastSent }}</span>
      </div>
    </form>

    <div class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">Log pengiriman</h3>
        <AppRefreshButton :loading="logsPending" @click="refreshLogs()" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Waktu</th>
              <th class="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Tipe</th>
              <th class="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Tanggal laporan</th>
              <th class="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Status</th>
              <th class="text-left px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Detail</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="!logs.length">
              <td colspan="5" class="text-center py-6 text-slate-400 text-xs">Belum ada pengiriman</td>
            </tr>
            <tr v-for="l in logs" :key="l.id">
              <td class="px-3 py-2 text-xs font-mono text-slate-600 whitespace-nowrap">{{ l.created_at }}</td>
              <td class="px-3 py-2 text-xs text-slate-600">{{ l.trigger_type }}<span v-if="l.sent_by_name" class="text-slate-400"> · {{ l.sent_by_name }}</span></td>
              <td class="px-3 py-2 text-xs text-slate-600">{{ l.report_date || '—' }}</td>
              <td class="px-3 py-2">
                <span :class="['badge text-xs', l.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">{{ l.status }}</span>
              </td>
              <td class="px-3 py-2 text-xs text-slate-500 max-w-[280px] break-words">{{ l.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
const { toast } = useConfirm()

if (!auth.isAdmin) await navigateTo('/')

const form = reactive({
  app_key: '', app_secret: '', robot_code: '', open_conversation_id: '',
  enabled: false, send_time: '17:00', staff_user_ids: [] as number[],
})
const hasSecret = ref(false)
const lastSent = ref<string | null>(null)
const saving = ref(false)
const testing = ref(false)

const { data: userData } = await useFetch('/api/users', { query: { limit: 500 } })
const staffUsers = computed(() =>
  ((userData.value as any)?.data || []).filter((u: any) => u.is_active && u.role !== 'customer')
)

const { data: logsData, refresh: refreshLogs, pending: logsPending } = await useFetch('/api/dingtalk/logs')
const logs = computed(() => (logsData.value as any)?.data || [])

async function load() {
  const res = await $fetch('/api/dingtalk/settings') as any
  const d = res?.data
  if (!d) return
  form.app_key = d.app_key
  form.robot_code = d.robot_code
  form.open_conversation_id = d.open_conversation_id
  form.enabled = d.enabled
  form.send_time = d.send_time
  form.staff_user_ids = d.staff_user_ids
  hasSecret.value = d.has_secret
  lastSent.value = d.last_sent_date
  form.app_secret = ''
}
await load()

async function save() {
  saving.value = true
  try {
    await $fetch('/api/dingtalk/settings', { method: 'PUT', body: { ...form } })
    toast('Pengaturan disimpan')
    await load()
  } catch (e: any) {
    toast(e?.data?.message || 'Gagal menyimpan', 'error')
  } finally { saving.value = false }
}

async function sendTest() {
  testing.value = true
  try {
    await $fetch('/api/dingtalk/test', { method: 'POST' })
    toast('Pesan tes terkirim')
  } catch (e: any) {
    toast(e?.data?.message || 'Gagal mengirim', 'error')
  } finally {
    testing.value = false
    refreshLogs()
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Ringkasan -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="card p-4"><div class="text-xs text-slate-500">{{ t('bills.summary.overdue') }}</div><div class="text-2xl font-semibold text-red-600">{{ summary.overdue }}</div></div>
      <div class="card p-4"><div class="text-xs text-slate-500">{{ t('bills.summary.soon') }}</div><div class="text-2xl font-semibold text-amber-600">{{ summary.soon }}</div></div>
      <div class="card p-4"><div class="text-xs text-slate-500">{{ t('bills.summary.active') }}</div><div class="text-2xl font-semibold text-slate-900">{{ summary.total_active }}</div></div>
    </div>

    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-wrap gap-2">
        <div class="flex gap-2 flex-wrap w-full sm:w-auto">
          <input v-model="search" class="input w-full sm:w-56" :placeholder="t('bills.searchHint')" />
          <div class="w-full sm:w-44"><AppSelect v-model="filterType" :options="typeFilterOptions" /></div>
          <div class="w-full sm:w-44"><AppSelect v-model="filterStatus" :options="statusFilterOptions" /></div>
        </div>
        <div class="flex items-center gap-2">
          <AppRefreshButton :loading="loading" @click="fetchBills()" />
          <button v-if="auth.isAdmin" @click="openForm()" class="btn-primary">+ {{ t('bills.add') }}</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="text-left px-4 py-2">{{ t('bills.provider') }}</th>
              <th class="text-left px-2 py-2">{{ t('bills.type') }}</th>
              <th class="text-left px-2 py-2">{{ t('bills.amount') }}</th>
              <th class="text-left px-2 py-2">{{ t('bills.cycle') }}</th>
              <th class="text-left px-2 py-2">{{ t('bills.dueDate') }}</th>
              <th class="text-left px-2 py-2">{{ t('bills.lastPaid') }}</th>
              <th class="px-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!bills.length"><td colspan="7" class="text-center text-slate-400 py-8">{{ t('bills.noBills') }}</td></tr>
            <tr v-for="b in bills" :key="b.id" :class="['hover:bg-slate-50', !b.is_active && 'opacity-50']">
              <td class="px-4 py-2">
                <div class="font-medium text-slate-900">{{ b.provider }}</div>
                <div v-if="b.title" class="text-xs text-slate-400">{{ b.title }}</div>
              </td>
              <td class="px-2 py-2">{{ typeLabel(b) }}</td>
              <td class="px-2 py-2 whitespace-nowrap">{{ money(b.amount) }}</td>
              <td class="px-2 py-2 text-xs">{{ t(`bills.cycles.${b.billing_cycle}`) }}</td>
              <td class="px-2 py-2 whitespace-nowrap">
                {{ fmtDate(b.due_date) }}
                <span v-if="b.is_active" :class="['badge ml-1', dueInfo(b).class]">{{ dueInfo(b).label }}</span>
                <span v-else class="badge ml-1 bg-slate-100 text-slate-500">{{ t('bills.inactive') }}</span>
              </td>
              <td class="px-2 py-2 text-xs text-slate-500">{{ b.last_paid_at ? fmtDate(b.last_paid_at) : t('bills.never') }}</td>
              <td class="px-2 py-2 whitespace-nowrap text-right">
                <button v-if="b.is_active" @click="openPay(b)" class="btn-primary py-1 px-2 text-xs">{{ t('bills.pay') }}</button>
                <button @click="openHistory(b)" class="btn-ghost py-1 px-2 text-xs">{{ t('bills.history') }}</button>
                <template v-if="auth.isAdmin">
                  <button @click="openForm(b)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
                  <button @click="deleteBill(b)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="pagination.page" :total-pages="pagination.totalPages" :total="pagination.total" :limit="pagination.limit" @page-change="p => { pagination.page = p; fetchBills() }" @limit-change="l => { pagination.limit = l; pagination.page = 1; fetchBills() }" />
    </div>

    <!-- Form tagihan -->
    <div v-if="modal === 'form'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('bills.edit') : t('bills.add') }}</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('bills.provider') }}</label><input v-model="form.provider" class="input" /></div>
          <div><label class="label">{{ t('bills.type') }}</label><AppSelect v-model="form.type" :options="typeOptions" /></div>
          <div v-if="form.type === 'lainnya'"><label class="label">{{ t('bills.typeOther') }}</label><input v-model="form.type_other" class="input" /></div>
          <div><label class="label">{{ t('bills.titleLabel') }}</label><input v-model="form.title" class="input" :placeholder="t('bills.titleHint')" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">{{ t('bills.amount') }}</label><input v-model.number="form.amount" type="number" min="0" class="input" /></div>
            <div><label class="label">{{ t('bills.cycle') }}</label><AppSelect v-model="form.billing_cycle" :options="cycleOptions" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">{{ t('bills.dueDate') }}</label><input v-model="form.due_date" type="date" class="input" /></div>
            <div><label class="label">{{ t('bills.remindDays') }}</label><input v-model.number="form.remind_days" type="number" min="1" max="90" class="input" /></div>
          </div>
          <div><label class="label">{{ t('bills.notes') }}</label><textarea v-model="form.notes" rows="2" class="input" /></div>
          <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="form.is_active" /> {{ t('bills.active') }}</label>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="saveBill" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Catat pembayaran -->
    <div v-if="modal === 'pay' && current" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-semibold text-slate-900 mb-1">{{ t('bills.payTitle') }}</h3>
        <p class="text-xs text-slate-500 mb-4">{{ current.provider }} · {{ typeLabel(current) }} · {{ t('bills.dueDate') }} {{ fmtDate(current.due_date) }}</p>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">{{ t('bills.paidAt') }}</label><input v-model="pForm.paid_at" type="date" class="input" /></div>
            <div><label class="label">{{ t('bills.amountPaid') }}</label><input v-model.number="pForm.amount_paid" type="number" min="0" class="input" /></div>
          </div>
          <div>
            <label class="label">{{ t('bills.newDueDate') }}</label>
            <input v-model="pForm.new_due_date" type="date" class="input" />
            <p class="text-xs text-slate-400 mt-1">{{ t('bills.newDueHint') }}</p>
          </div>
          <div>
            <label class="label">{{ t('bills.proof') }}</label>
            <label class="btn-secondary inline-block cursor-pointer py-1 px-3 text-xs">
              {{ uploading ? t('bills.uploading') : t('bills.uploadProof') }}
              <input type="file" accept="image/*,application/pdf" class="hidden" :disabled="uploading" @change="onPickProof" />
            </label>
            <a v-if="pForm.proof" :href="`/uploads/${pForm.proof.filename}`" target="_blank" rel="noopener" class="text-xs text-indigo-600 ml-2">{{ pForm.proof.original_name }}</a>
          </div>
          <div><label class="label">{{ t('bills.notes') }}</label><textarea v-model="pForm.note" rows="2" class="input" /></div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="savePayment" :disabled="uploading" class="btn-primary flex-1 disabled:opacity-50">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Riwayat pembayaran -->
    <div v-if="modal === 'history' && current" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ t('bills.historyTitle') }}</h3>
            <p class="text-xs text-slate-500">{{ current.provider }} · {{ typeLabel(current) }}</p>
          </div>
          <button @click="closeModal" class="btn-ghost py-1 px-2 text-xs">{{ t('common.close') }}</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="text-left px-3 py-2">{{ t('bills.paidAt') }}</th>
                <th class="text-left px-2 py-2">{{ t('bills.amountPaid') }}</th>
                <th class="text-left px-2 py-2">{{ t('bills.dueChange') }}</th>
                <th class="text-left px-2 py-2">{{ t('bills.proof') }}</th>
                <th class="text-left px-2 py-2">{{ t('bills.paidBy') }}</th>
                <th v-if="auth.isAdmin" class="px-2" />
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!payments.length"><td colspan="6" class="text-center text-slate-400 py-6">{{ t('bills.noHistory') }}</td></tr>
              <tr v-for="p in payments" :key="p.id" class="hover:bg-slate-50">
                <td class="px-3 py-2 whitespace-nowrap">{{ fmtDate(p.paid_at) }}</td>
                <td class="px-2 py-2 whitespace-nowrap">{{ money(p.amount_paid) }}</td>
                <td class="px-2 py-2 text-xs whitespace-nowrap">{{ fmtDate(p.previous_due_date) }} → {{ fmtDate(p.new_due_date) }}</td>
                <td class="px-2 py-2 text-xs">
                  <a v-if="p.proof_filename" :href="`/uploads/${p.proof_filename}`" target="_blank" rel="noopener" class="text-indigo-600">{{ p.proof_original_name || t('bills.proof') }}</a>
                  <span v-else class="text-slate-400">—</span>
                  <div v-if="p.note" class="text-slate-400">{{ p.note }}</div>
                </td>
                <td class="px-2 py-2 text-xs">{{ p.paid_by_name || '—' }}</td>
                <td v-if="auth.isAdmin" class="px-2"><button @click="deletePayment(p)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :page="hPage.page" :total-pages="hPage.totalPages" :total="hPage.total" :limit="hPage.limit" @page-change="p => { hPage.page = p; fetchPayments() }" @limit-change="l => { hPage.limit = l; hPage.page = 1; fetchPayments() }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calcNextDue } from '~/utils/billCycle'

definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()
const { fmtDate } = useDate()
const { confirmDelete, toast } = useConfirm()

if (auth.user?.role === 'customer') await navigateTo('/')

const todayStr = () => new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
const money = (v: any) => (v === null || v === undefined || v === '' ? '—' : 'Rp ' + Number(v).toLocaleString('id-ID'))

const typeKeys = ['internet', 'hosting', 'domain', 'lainnya']
const cycleKeys = ['monthly', 'quarterly', 'semiannual', 'yearly', 'once']
const typeOptions = computed(() => typeKeys.map(k => ({ value: k, label: t(`bills.types.${k}`) })))
const cycleOptions = computed(() => cycleKeys.map(k => ({ value: k, label: t(`bills.cycles.${k}`) })))
const typeFilterOptions = computed(() => [{ value: '', label: t('bills.filterAllTypes') }, ...typeOptions.value])
const statusFilterOptions = computed(() => [{ value: '', label: t('bills.filterAllStatus') },
  ...['overdue', 'soon', 'ok', 'inactive'].map(k => ({ value: k, label: t(`bills.status.${k}`) }))])
const typeLabel = (b: any) => (b.type === 'lainnya' ? b.type_other : t(`bills.types.${b.type}`))

function dueInfo(b: any) {
  const d = Number(b.days_left)
  if (d < 0) return { class: 'bg-red-100 text-red-700', label: t('bills.overdue', { n: -d }) }
  if (d <= Number(b.remind_days)) return { class: 'bg-amber-100 text-amber-700', label: d === 0 ? t('bills.today') : t('bills.daysLeft', { n: d }) }
  return { class: 'bg-green-100 text-green-700', label: t('bills.daysLeft', { n: d }) }
}

// ── Daftar ────────────────────────────────────────────────────────────────
const bills = ref<any[]>([])
const loading = ref(false)
const summary = reactive({ total_active: 0, overdue: 0, soon: 0 })
const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const pagination = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

async function fetchBills() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/bills', {
      query: { q: search.value || undefined, type: filterType.value || undefined, status: filterStatus.value || undefined, page: pagination.page, limit: pagination.limit },
    })
    bills.value = res.data
    Object.assign(pagination, { total: res.total, totalPages: res.totalPages })
    Object.assign(summary, res.summary)
  } finally { loading.value = false }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { pagination.page = 1; fetchBills() }, 300) })
watch([filterType, filterStatus], () => { pagination.page = 1; fetchBills() })
onMounted(fetchBills)

const modal = ref<'form' | 'pay' | 'history' | null>(null)
const editing = ref<any>(null)
const current = ref<any>(null)
function closeModal() { modal.value = null; editing.value = null; current.value = null }

// ── Tambah / ubah tagihan ─────────────────────────────────────────────────
const blankForm = () => ({ provider: '', type: 'internet', type_other: '', title: '', amount: null as number | null, billing_cycle: 'monthly', due_date: todayStr(), remind_days: 7, notes: '', is_active: true })
const form = reactive<any>(blankForm())

function openForm(b?: any) {
  editing.value = b || null
  Object.assign(form, b
    ? { provider: b.provider, type: b.type, type_other: b.type_other || '', title: b.title || '', amount: b.amount === null ? null : Number(b.amount), billing_cycle: b.billing_cycle, due_date: String(b.due_date).slice(0, 10), remind_days: b.remind_days, notes: b.notes || '', is_active: !!b.is_active }
    : blankForm())
  modal.value = 'form'
}
async function saveBill() {
  try {
    const body = { ...form, amount: form.amount === null || form.amount === '' ? null : form.amount, is_active: form.is_active ? 1 : 0 }
    if (editing.value) await $fetch(`/api/bills/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/bills', { method: 'POST', body })
    toast(t('bills.saved')); closeModal(); await fetchBills()
  } catch (e: any) { toast(e?.data?.statusMessage || t('common.error'), 'error') }
}
async function deleteBill(b: any) {
  if (!await confirmDelete(t('bills.deleteText'))) return
  await $fetch(`/api/bills/${b.id}`, { method: 'DELETE' })
  await fetchBills()
}

// ── Catat pembayaran ──────────────────────────────────────────────────────
const pForm = reactive<any>({ paid_at: todayStr(), amount_paid: null, new_due_date: '', note: '', proof: null })
const uploading = ref(false)
function openPay(b: any) {
  current.value = b
  Object.assign(pForm, {
    paid_at: todayStr(), amount_paid: b.amount === null ? null : Number(b.amount),
    new_due_date: calcNextDue(String(b.due_date).slice(0, 10), b.billing_cycle), note: '', proof: null,
  })
  modal.value = 'pay'
}
async function onPickProof(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('menu', 'bills')
    const res: any = await $fetch('/api/upload', { method: 'POST', body: fd })
    pForm.proof = res.data
  } catch (err: any) {
    toast(err?.data?.statusMessage || t('common.error'), 'error')
  } finally { uploading.value = false }
}
async function savePayment() {
  try {
    await $fetch(`/api/bills/${current.value.id}/payments`, {
      method: 'POST',
      body: { ...pForm, amount_paid: pForm.amount_paid === '' ? null : pForm.amount_paid },
    })
    toast(t('bills.paid')); closeModal(); await fetchBills()
  } catch (e: any) { toast(e?.data?.statusMessage || t('common.error'), 'error') }
}

// ── Riwayat ───────────────────────────────────────────────────────────────
const payments = ref<any[]>([])
const hPage = reactive({ page: 1, limit: 10, total: 0, totalPages: 1 })
async function fetchPayments() {
  const res: any = await $fetch(`/api/bills/${current.value.id}/payments`, { query: { page: hPage.page, limit: hPage.limit } })
  payments.value = res.data
  Object.assign(hPage, { total: res.total, totalPages: res.totalPages })
}
async function openHistory(b: any) {
  current.value = b
  hPage.page = 1
  payments.value = []
  modal.value = 'history'
  await fetchPayments()
}
async function deletePayment(p: any) {
  if (!await confirmDelete(t('bills.deletePaymentText'))) return
  await $fetch(`/api/bill-payments/${p.id}`, { method: 'DELETE' })
  await Promise.all([fetchPayments(), fetchBills()])
}
</script>

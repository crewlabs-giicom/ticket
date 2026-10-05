<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <button @click="tab = 'schedule'" :class="tab === 'schedule' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.cleaning.tabs.schedule') }}</button>
        <button @click="tab = 'history'" :class="tab === 'history' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.cleaning.tabs.history') }}</button>
      </div>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refreshAll()" />
        <button @click="openDone()" class="btn-secondary">{{ t('infra.cleaning.logAdhoc') }}</button>
        <button v-if="auth.isAdmin" @click="openScheduleForm()" class="btn-primary">+ {{ t('infra.cleaning.addSchedule') }}</button>
      </div>
    </div>

    <!-- Schedules -->
    <div v-if="tab === 'schedule'" class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="text-left px-4 py-2">{{ t('infra.cleaning.title') }}</th>
            <th class="text-left px-2 py-2">{{ t('infra.cleaning.target') }}</th>
            <th class="text-left px-2 py-2">{{ t('infra.cleaning.frequency') }}</th>
            <th class="text-left px-2 py-2">{{ t('infra.cleaning.nextDue') }}</th>
            <th class="text-left px-2 py-2">{{ t('infra.cleaning.lastCleaned') }}</th>
            <th class="text-left px-2 py-2">{{ t('infra.cleaning.assignedTo') }}</th>
            <th class="px-2" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!schedules.length"><td colspan="7" class="text-center text-slate-400 py-8">{{ t('infra.cleaning.noSchedule') }}</td></tr>
          <tr v-for="s in schedules" :key="s.id" :class="['hover:bg-slate-50', !s.is_active && 'opacity-50']">
            <td class="px-4 py-2 font-medium text-slate-900">{{ s.title }}</td>
            <td class="px-2 py-2">{{ s.room_name }}<span class="text-xs text-slate-400"> · {{ s.pc_name || t('infra.cleaning.allPcs') }}</span></td>
            <td class="px-2 py-2">{{ t('infra.cleaning.everyDays', { n: s.frequency_days }) }}</td>
            <td class="px-2 py-2 whitespace-nowrap">
              {{ fmtDate(s.next_due_date) }}
              <span v-if="s.is_active" :class="['badge ml-1', dueInfo(s).class]">{{ dueInfo(s).label }}</span>
              <span v-else class="badge ml-1 bg-slate-100 text-slate-500">{{ t('infra.common.inactive') }}</span>
            </td>
            <td class="px-2 py-2 text-xs text-slate-500">{{ s.last_cleaned_at ? fmtDateTime(s.last_cleaned_at) : t('infra.cleaning.never') }}</td>
            <td class="px-2 py-2 text-xs">{{ s.assigned_name || '—' }}</td>
            <td class="px-2 py-2 whitespace-nowrap text-right">
              <button v-if="s.is_active" @click="openDone(s)" class="btn-primary py-1 px-2 text-xs">{{ t('infra.cleaning.markDone') }}</button>
              <template v-if="auth.isAdmin">
                <button @click="openScheduleForm(s)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
                <button @click="deleteSchedule(s)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- History -->
    <div v-else class="card overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-wrap gap-2">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.cleaning.tabs.history') }}</h3>
        <div class="w-full sm:w-56"><AppSelect v-model="filterRoom" :options="[{ value: '', label: t('infra.network.allRooms') }, ...roomOptions]" /></div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="text-left px-4 py-2">{{ t('infra.cleaning.cleanedAt') }}</th>
              <th class="text-left px-2 py-2">{{ t('infra.cleaning.target') }}</th>
              <th class="text-left px-2 py-2">{{ t('infra.cleaning.tasksDone') }}</th>
              <th class="text-left px-2 py-2">{{ t('infra.cleaning.cleanedBy') }}</th>
              <th class="text-left px-2 py-2">{{ t('infra.network.note') }}</th>
              <th v-if="auth.isAdmin" class="px-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!logs.length"><td colspan="6" class="text-center text-slate-400 py-8">{{ t('infra.cleaning.noHistory') }}</td></tr>
            <tr v-for="l in logs" :key="l.id" class="hover:bg-slate-50">
              <td class="px-4 py-2 whitespace-nowrap">{{ fmtDateTime(l.cleaned_at) }}</td>
              <td class="px-2 py-2">{{ l.room_name }}<span class="text-xs text-slate-400"> · {{ l.pc_name || t('infra.cleaning.allPcs') }}</span><div v-if="l.schedule_title" class="text-xs text-slate-400">{{ l.schedule_title }}</div></td>
              <td class="px-2 py-2 text-xs">{{ l.tasks_done || '—' }}</td>
              <td class="px-2 py-2 text-xs">{{ l.cleaned_by_name || '—' }}</td>
              <td class="px-2 py-2 text-xs text-slate-500">{{ l.note || '—' }}</td>
              <td v-if="auth.isAdmin" class="px-2"><button @click="deleteLog(l)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="pagination.page" :total-pages="pagination.totalPages" :total="pagination.total" :limit="pagination.limit" @page-change="p => { pagination.page = p; fetchLogs() }" @limit-change="l => { pagination.limit = l; pagination.page = 1; fetchLogs() }" />
    </div>

    <!-- Schedule modal -->
    <div v-if="modal === 'schedule'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('infra.cleaning.editSchedule') : t('infra.cleaning.addSchedule') }}</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('infra.cleaning.title') }}</label><input v-model="sForm.title" class="input" :placeholder="t('infra.cleaning.titleHint')" /></div>
          <div><label class="label">{{ t('infra.network.room') }}</label><AppSelect v-model="sForm.room_id" :options="roomOptions" /></div>
          <div><label class="label">PC</label><AppSelect v-model="sForm.pc_id" :options="pcOptions(sForm.room_id)" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">{{ t('infra.cleaning.frequencyDays') }}</label><input v-model.number="sForm.frequency_days" type="number" min="1" class="input" /></div>
            <div><label class="label">{{ t('infra.cleaning.nextDue') }}</label><input v-model="sForm.next_due_date" type="date" class="input" /></div>
          </div>
          <div><label class="label">{{ t('infra.cleaning.assignedTo') }}</label><AppSelect v-model="sForm.assigned_to" :options="userOptions" /></div>
          <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="sForm.is_active" /> {{ t('infra.common.active') }}</label>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="saveSchedule" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Done modal -->
    <div v-if="modal === 'done'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-1">{{ t('infra.cleaning.doneTitle') }}</h3>
        <p v-if="doneSchedule" class="text-xs text-slate-500 mb-4">{{ doneSchedule.title }} — {{ doneSchedule.room_name }}</p>
        <div class="space-y-4 mt-3">
          <template v-if="!doneSchedule">
            <div><label class="label">{{ t('infra.network.room') }}</label><AppSelect v-model="dForm.room_id" :options="roomOptions" /></div>
            <div><label class="label">PC</label><AppSelect v-model="dForm.pc_id" :options="pcOptions(dForm.room_id)" /></div>
          </template>
          <div>
            <label class="label">{{ t('infra.cleaning.tasksDone') }}</label>
            <div class="grid grid-cols-2 gap-1.5">
              <label v-for="k in taskKeys" :key="k" class="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" :value="t(`infra.cleaning.tasks.${k}`)" v-model="dForm.tasks_done" /> {{ t(`infra.cleaning.tasks.${k}`) }}
              </label>
            </div>
          </div>
          <div><label class="label">{{ t('infra.network.note') }}</label><textarea v-model="dForm.note" rows="2" class="input" /></div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="saveDone" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()
const { fmtDate, fmtDateTime } = useDate()
const { confirmDelete, toast } = useConfirm()

if (auth.user?.role === 'customer') await navigateTo('/')

const { data: schedRes, refresh: refreshSched, pending } = await useFetch<any>('/api/cleaning/schedules')
const { data: roomsRes } = await useFetch<any>('/api/rooms')
const { data: pcsRes } = await useFetch<any>('/api/pcs')
const { data: usersRes } = await useFetch<any>('/api/users', { query: { role: 'admin,staff', limit: 500 } })

const schedules = computed<any[]>(() => schedRes.value?.data || [])
const roomOptions = computed(() => (roomsRes.value?.data || []).filter((r: any) => r.is_active).map((r: any) => ({ value: r.id, label: r.name })))
const userOptions = computed(() => [{ value: null, label: '—' }, ...(usersRes.value?.data || []).map((u: any) => ({ value: u.id, label: u.name }))])
function pcOptions(roomId: number | null) {
  return [
    { value: null, label: t('infra.cleaning.allPcs') },
    ...(pcsRes.value?.data || []).filter((p: any) => p.room_id === roomId && p.is_active).map((p: any) => ({ value: p.id, label: p.name })),
  ]
}

const tab = ref<'schedule' | 'history'>('schedule')
const modal = ref<'schedule' | 'done' | null>(null)
const editing = ref<any>(null)
function closeModal() { modal.value = null; editing.value = null; doneSchedule.value = null }

function dueInfo(s: any) {
  const d = Number(s.days_left)
  if (d < 0) return { class: 'bg-red-100 text-red-700', label: t('infra.cleaning.overdue', { n: -d }) }
  if (d <= 3) return { class: 'bg-amber-100 text-amber-700', label: d === 0 ? t('infra.cleaning.today') : t('infra.cleaning.daysLeft', { n: d }) }
  return { class: 'bg-green-100 text-green-700', label: t('infra.cleaning.daysLeft', { n: d }) }
}

// ── Schedule CRUD ─────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
const sForm = reactive<any>({ title: '', room_id: null, pc_id: null, frequency_days: 30, next_due_date: todayStr(), assigned_to: null, is_active: true })
watch(() => sForm.room_id, () => { if (!editing.value) sForm.pc_id = null })

function openScheduleForm(s?: any) {
  editing.value = s || null
  Object.assign(sForm, s
    ? { title: s.title, room_id: s.room_id, pc_id: s.pc_id, frequency_days: s.frequency_days, next_due_date: String(s.next_due_date).slice(0, 10), assigned_to: s.assigned_to, is_active: !!s.is_active }
    : { title: '', room_id: null, pc_id: null, frequency_days: 30, next_due_date: todayStr(), assigned_to: null, is_active: true })
  modal.value = 'schedule'
}
async function saveSchedule() {
  try {
    const body = { ...sForm, is_active: sForm.is_active ? 1 : 0 }
    if (editing.value) await $fetch(`/api/cleaning/schedules/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/cleaning/schedules', { method: 'POST', body })
    toast(t('infra.common.saved')); closeModal(); await refreshSched()
  } catch (e: any) { toast(e?.data?.statusMessage || t('common.error'), 'error') }
}
async function deleteSchedule(s: any) {
  if (!await confirmDelete(t('infra.cleaning.deleteScheduleText'), t('infra.common.deleteTitle'))) return
  await $fetch(`/api/cleaning/schedules/${s.id}`, { method: 'DELETE' })
  await refreshAll()
}

// ── Mark done / ad-hoc log ────────────────────────────────────────────────
const taskKeys = ['dust', 'physical', 'diskCleanup', 'update', 'cable', 'antivirus']
const doneSchedule = ref<any>(null)
const dForm = reactive<any>({ room_id: null, pc_id: null, tasks_done: [] as string[], note: '' })
watch(() => dForm.room_id, () => { dForm.pc_id = null })

function openDone(s?: any) {
  doneSchedule.value = s || null
  Object.assign(dForm, { room_id: s?.room_id ?? null, pc_id: s?.pc_id ?? null, tasks_done: [], note: '' })
  modal.value = 'done'
}
async function saveDone() {
  if (!doneSchedule.value && !dForm.room_id) return toast(t('infra.network.selectRoom'), 'warning')
  try {
    await $fetch('/api/cleaning/logs', {
      method: 'POST',
      body: { schedule_id: doneSchedule.value?.id, room_id: dForm.room_id, pc_id: dForm.pc_id, tasks_done: dForm.tasks_done, note: dForm.note },
    })
    toast(t('infra.common.saved')); closeModal()
    await Promise.all([refreshSched(), fetchLogs()])
  } catch (e: any) { toast(e?.data?.statusMessage || t('common.error'), 'error') }
}

// ── History ───────────────────────────────────────────────────────────────
const logs = ref<any[]>([])
const filterRoom = ref<number | ''>('')
const pagination = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })
async function fetchLogs() {
  const res: any = await $fetch('/api/cleaning/logs', { query: { room_id: filterRoom.value || undefined, page: pagination.page, limit: pagination.limit } })
  logs.value = res.data
  Object.assign(pagination, { total: res.total, totalPages: res.totalPages })
}
watch(filterRoom, () => { pagination.page = 1; fetchLogs() })
onMounted(fetchLogs)
async function refreshAll() { await Promise.all([refreshSched(), fetchLogs()]) }
async function deleteLog(l: any) {
  if (!await confirmDelete(undefined, t('infra.common.deleteTitle'))) return
  await $fetch(`/api/cleaning/logs/${l.id}`, { method: 'DELETE' })
  await fetchLogs()
}
</script>

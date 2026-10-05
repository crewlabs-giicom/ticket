<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-sm text-slate-500">{{ t('infra.network.subtitle') }}</p>
      <AppRefreshButton :loading="pending" @click="fetchHistory()" />
    </div>

    <!-- Test runner -->
    <div class="card p-4 space-y-4">
      <div class="flex items-center gap-2">
        <button @click="mode = 'auto'" :class="mode === 'auto' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.network.autoTest') }}</button>
        <button @click="mode = 'manual'" :class="mode === 'manual' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.network.manualInput') }}</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="label">{{ t('infra.network.room') }}</label>
          <AppSelect v-model="form.room_id" :options="roomOptions" :placeholder="t('infra.network.selectRoom')" :disabled="test.running.value" />
        </div>
        <div>
          <label class="label">{{ t('infra.network.device') }}</label>
          <AppSelect v-model="form.device_id" :options="deviceOptions" :placeholder="t('infra.network.allDevices')" :disabled="test.running.value" />
        </div>
        <div>
          <label class="label">{{ t('infra.network.clients') }}</label>
          <input v-model.number="form.connected_clients" type="number" min="0" class="input" :placeholder="t('infra.network.clientsHint')" />
        </div>
        <div>
          <label class="label">{{ t('infra.network.note') }}</label>
          <input v-model="form.note" class="input" />
        </div>
      </div>

      <!-- Auto -->
      <template v-if="mode === 'auto'">
        <div class="flex items-center gap-3 flex-wrap">
          <button v-if="!test.running.value" @click="startTest" :disabled="!form.room_id" class="btn-primary disabled:opacity-50">{{ t('infra.network.runTest') }}</button>
          <button v-else @click="test.stop()" class="btn-danger">{{ t('infra.network.stopTest') }}</button>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <label>{{ t('infra.network.pings') }}</label>
            <select v-model.number="pings" :disabled="test.running.value" class="border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <option :value="30">30</option><option :value="40">40</option><option :value="60">60</option>
            </select>
          </div>
          <p class="text-xs text-slate-400">{{ t('infra.network.autoHint') }}</p>
        </div>

        <div v-if="test.running.value" class="space-y-1">
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span>{{ t(`infra.network.phase.${test.phase.value}`) }}</span>
            <span v-if="test.liveMbps.value !== null" class="font-mono">{{ test.liveMbps.value }} Mbps</span>
          </div>
          <div class="h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-primary-500 transition-all" :style="{ width: `${Math.round(test.progress.value * 100)}%` }" /></div>
        </div>
        <p v-if="test.error.value" class="text-sm text-red-500">{{ test.error.value }}</p>

        <div v-if="test.result.value" class="space-y-3">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div v-for="m in metricCards(test.result.value)" :key="m.label" class="rounded-xl bg-slate-50 p-3">
              <div class="text-xs text-slate-500">{{ m.label }}</div>
              <div class="text-lg font-semibold text-slate-900">{{ m.value }}<span class="text-xs font-normal text-slate-400 ml-1">{{ m.unit }}</span></div>
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <p>{{ analysisText({ ...test.result.value, connected_clients: form.connected_clients }) }}</p>
            <ul v-if="suggestions({ ...test.result.value, connected_clients: form.connected_clients }).length" class="list-disc pl-4 text-slate-500 space-y-0.5">
              <li v-for="k in suggestions({ ...test.result.value, connected_clients: form.connected_clients })" :key="k">{{ t(`infra.network.suggestion.${k}`) }}</li>
            </ul>
          </div>
          <button @click="saveResult(test.result.value, 'browser')" :disabled="saving" class="btn-primary">{{ t('infra.network.saveResult') }}</button>
        </div>
      </template>

      <!-- Manual -->
      <template v-else>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="f in manualFields" :key="f.key">
            <label class="label">{{ f.label }} ({{ f.unit }})</label>
            <input v-model.number="manual[f.key]" type="number" min="0" step="0.01" class="input" />
          </div>
        </div>
        <button @click="saveResult(manual, 'manual')" :disabled="saving || !form.room_id" class="btn-primary disabled:opacity-50">{{ t('infra.network.saveResult') }}</button>
      </template>
    </div>

    <!-- Trend -->
    <div class="card p-4">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.network.trend') }}</h3>
        <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <input v-model="dateFrom" type="date" class="input flex-1 sm:flex-none sm:w-auto min-w-0" :aria-label="t('infra.network.dateFrom')" />
          <span class="text-slate-400">—</span>
          <input v-model="dateTo" type="date" class="input flex-1 sm:flex-none sm:w-auto min-w-0" :aria-label="t('infra.network.dateTo')" />
          <div class="w-full sm:w-56"><AppSelect v-model="filterRoom" :options="[{ value: '', label: t('infra.network.allRooms') }, ...roomOptions]" /></div>
          <button @click="resetFilter" class="btn-ghost py-1 px-2 text-xs">{{ t('infra.network.resetFilter') }}</button>
        </div>
      </div>
      <ClientOnly>
        <div v-if="trendRows.length > 1" class="h-56"><Line :data="chartData" :options="chartOptions" /></div>
        <p v-else class="text-sm text-slate-400 text-center py-8">{{ t('infra.network.noTrend') }}</p>
      </ClientOnly>
    </div>

    <!-- History -->
    <div class="card overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100"><h3 class="text-sm font-semibold text-slate-900">{{ t('infra.network.history') }}</h3></div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="text-left px-4 py-2">{{ t('infra.network.time') }}</th>
              <th class="text-left px-2 py-2 hidden md:table-cell">{{ t('infra.network.room') }}</th>
              <th class="text-right px-2 py-2 hidden md:table-cell">↓ Mbps</th>
              <th class="text-right px-2 py-2 hidden md:table-cell">↑ Mbps</th>
              <th class="text-right px-2 py-2 hidden md:table-cell">{{ t('infra.network.latency') }}</th>
              <th class="text-right px-2 py-2 hidden md:table-cell" :title="t('infra.network.jitterHint')">Jitter (idle/↓/↑)</th>
              <th class="text-right px-2 py-2 hidden md:table-cell">Loss</th>
              <th class="text-right px-2 py-2 hidden md:table-cell">{{ t('infra.network.clientsShort') }}</th>
              <th class="text-center px-2 py-2">{{ t('infra.network.status.label') }}</th>
              <th class="text-left px-2 py-2">{{ t('infra.network.analysis.label') }}</th>
              <th class="text-left px-2 py-2 hidden md:table-cell">{{ t('infra.network.checkedBy') }}</th>
              <th v-if="auth.isAdmin" class="px-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!rows.length"><td colspan="12" class="text-center text-slate-400 py-8">{{ t('infra.network.noHistory') }}</td></tr>
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50">
              <td class="px-4 py-2 md:whitespace-nowrap">
                {{ fmtDateTime(r.checked_at) }}
                <div class="md:hidden text-xs text-slate-500 mt-0.5">{{ r.room_name }}<span v-if="r.device_name"> · {{ r.device_name }}</span></div>
                <div class="md:hidden text-xs text-slate-400 font-mono mt-0.5">↓{{ fmt(r.download_mbps) }} ↑{{ fmt(r.upload_mbps) }} Mbps · {{ fmt(r.latency_ms) }} ms · {{ fmt(r.packet_loss_pct) }}%</div>
              </td>
              <td class="px-2 py-2 hidden md:table-cell">{{ r.room_name }}<span v-if="r.device_name" class="text-xs text-slate-400"> · {{ r.device_name }}</span></td>
              <td class="px-2 py-2 text-right font-mono hidden md:table-cell">{{ fmt(r.download_mbps) }}</td>
              <td class="px-2 py-2 text-right font-mono hidden md:table-cell">{{ fmt(r.upload_mbps) }}</td>
              <td class="px-2 py-2 text-right font-mono hidden md:table-cell">{{ fmt(r.latency_ms) }} ms</td>
              <td class="px-2 py-2 text-right font-mono whitespace-nowrap hidden md:table-cell">{{ fmt(r.jitter_ms) }} / {{ fmt(r.download_jitter_ms) }} / {{ fmt(r.upload_jitter_ms) }}</td>
              <td class="px-2 py-2 text-right font-mono hidden md:table-cell">{{ fmt(r.packet_loss_pct) }}%</td>
              <td class="px-2 py-2 text-right hidden md:table-cell">{{ r.connected_clients ?? '—' }}</td>
              <td class="px-2 py-2 text-center"><span :class="['badge', statusClass[r.status]]">{{ t(`infra.network.status.${r.status}`) }}</span></td>
              <td class="px-2 py-2 text-xs text-slate-600 md:min-w-[14rem]">
                {{ analysisText(r) }}
                <ul v-if="suggestions(r).length" class="mt-1 list-disc pl-4 text-slate-500 space-y-0.5">
                  <li v-for="k in suggestions(r)" :key="k">{{ t(`infra.network.suggestion.${k}`) }}</li>
                </ul>
              </td>
              <td class="px-2 py-2 text-xs text-slate-500 hidden md:table-cell">{{ r.checked_by_name || '—' }} <span class="text-slate-300">({{ t(`infra.network.source.${r.source}`) }})</span></td>
              <td v-if="auth.isAdmin" class="px-2"><button @click="deleteRow(r)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="pagination.page" :total-pages="pagination.totalPages" :total="pagination.total" :limit="pagination.limit" @page-change="p => { pagination.page = p; fetchHistory() }" @limit-change="l => { pagination.limit = l; pagination.page = 1; fetchHistory() }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()
const { fmtDateTime } = useDate()
const { confirmDelete, toast } = useConfirm()
const test = useNetworkTest()

if (auth.user?.role === 'customer') await navigateTo('/')

const { data: roomsRes } = await useFetch<any>('/api/rooms')
const { data: devicesRes } = await useFetch<any>('/api/devices')
const roomOptions = computed(() => (roomsRes.value?.data || []).filter((r: any) => r.is_active).map((r: any) => ({ value: r.id, label: r.name })))

const mode = ref<'auto' | 'manual'>('auto')
const pings = ref(40)
const saving = ref(false)
const form = reactive<{ room_id: number | null; device_id: number | null; connected_clients: number | null; note: string }>({ room_id: null, device_id: null, connected_clients: null, note: '' })
const deviceOptions = computed(() => [
  { value: null, label: t('infra.network.allDevices') },
  ...(devicesRes.value?.data || []).filter((d: any) => d.room_id === form.room_id && d.is_active).map((d: any) => ({ value: d.id, label: d.name })),
])
watch(() => form.room_id, () => { form.device_id = null })

const manual = reactive<Record<string, number | null>>({
  download_mbps: null, upload_mbps: null, latency_ms: null, jitter_ms: null, download_jitter_ms: null, upload_jitter_ms: null, packet_loss_pct: null,
})
const manualFields = computed(() => [
  { key: 'download_mbps', label: t('infra.network.download'), unit: 'Mbps' },
  { key: 'upload_mbps', label: t('infra.network.upload'), unit: 'Mbps' },
  { key: 'latency_ms', label: t('infra.network.latency'), unit: 'ms' },
  { key: 'jitter_ms', label: t('infra.network.jitter'), unit: 'ms' },
  { key: 'download_jitter_ms', label: t('infra.network.downloadJitter'), unit: 'ms' },
  { key: 'upload_jitter_ms', label: t('infra.network.uploadJitter'), unit: 'ms' },
  { key: 'packet_loss_pct', label: t('infra.network.packetLoss'), unit: '%' },
])

const fmt = (v: any) => (v === null || v === undefined ? '—' : Number(v).toFixed(1))
function metricCards(r: any) {
  return [
    { label: t('infra.network.download'), value: fmt(r.download_mbps), unit: 'Mbps' },
    { label: t('infra.network.upload'), value: fmt(r.upload_mbps), unit: 'Mbps' },
    { label: t('infra.network.latency'), value: fmt(r.latency_ms), unit: 'ms' },
    { label: t('infra.network.packetLoss'), value: fmt(r.packet_loss_pct), unit: '%' },
    { label: t('infra.network.jitter'), value: fmt(r.jitter_ms), unit: 'ms' },
    { label: t('infra.network.downloadJitter'), value: fmt(r.download_jitter_ms), unit: 'ms' },
    { label: t('infra.network.uploadJitter'), value: fmt(r.upload_jitter_ms), unit: 'ms' },
    { label: t('infra.network.duration'), value: r.duration_sec ?? '—', unit: 's' },
  ]
}
const statusClass: Record<string, string> = { good: 'bg-green-100 text-green-700', fair: 'bg-amber-100 text-amber-700', poor: 'bg-red-100 text-red-700' }

async function startTest() {
  if (!form.room_id) return
  await test.run(pings.value)
}

async function saveResult(result: any, source: 'browser' | 'manual') {
  if (!form.room_id) return toast(t('infra.network.selectRoom'), 'warning')
  saving.value = true
  try {
    await $fetch('/api/network-checks', {
      method: 'POST',
      body: { ...result, source, room_id: form.room_id, device_id: form.device_id, connected_clients: form.connected_clients, note: form.note },
    })
    toast(t('infra.common.saved'))
    test.result.value = null
    if (source === 'manual') Object.keys(manual).forEach(k => { manual[k] = null })
    pagination.page = 1
    await Promise.all([fetchHistory(), fetchTrend()])
  } catch (e: any) {
    toast(e?.data?.statusMessage || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

// ── History + trend ───────────────────────────────────────────────────────
const filterRoom = ref<number | ''>('')
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d)
function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - 1)
  return { from: ymd(from), to: ymd(to) }
}
const dateFrom = ref(defaultRange().from)
const dateTo = ref(defaultRange().to)
function dateQuery() {
  let from = dateFrom.value || undefined
  let to = dateTo.value || undefined
  if (from && to && from > to) [from, to] = [to, from]
  return { from, to }
}
function resetFilter() {
  const r = defaultRange()
  dateFrom.value = r.from
  dateTo.value = r.to
  filterRoom.value = ''
}
function suggestions(r: any) {
  return suggestNetworkFixes(r).slice(0, 3)
}
function analysisText(r: any) {
  const f = explainNetworkStatus(r)
  if (!f.length) return t('infra.network.analysis.allWithin')
  const parts = f.map(x => t(`infra.network.analysis.${x.metric}`, { value: Number(x.value).toFixed(1), limit: x.limit }))
  return `${t(`infra.network.status.${f.some(x => x.level === 'poor') ? 'poor' : 'fair'}`)}: ${parts.join(', ')}`
}
const rows = ref<any[]>([])
const trendRows = ref<any[]>([])
const pending = ref(false)
const pagination = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

async function fetchHistory() {
  pending.value = true
  try {
    const res: any = await $fetch('/api/network-checks', { query: { room_id: filterRoom.value || undefined, ...dateQuery(), page: pagination.page, limit: pagination.limit } })
    rows.value = res.data
    Object.assign(pagination, { total: res.total, totalPages: res.totalPages })
  } finally { pending.value = false }
}
async function fetchTrend() {
  const res: any = await $fetch('/api/network-checks', { query: { room_id: filterRoom.value || undefined, ...dateQuery(), limit: 30 } })
  trendRows.value = [...res.data].reverse()
}
watch([filterRoom, dateFrom, dateTo],() => { pagination.page = 1; fetchHistory(); fetchTrend() })
onMounted(() => Promise.all([fetchHistory(), fetchTrend()]))

const chartData = computed(() => ({
  labels: trendRows.value.map(r => fmtDateTime(r.checked_at).slice(0, 16)),
  datasets: [
    { label: `${t('infra.network.download')} (Mbps)`, data: trendRows.value.map(r => r.download_mbps), borderColor: '#6366f1', backgroundColor: '#6366f1', yAxisID: 'y', tension: 0.3 },
    { label: `${t('infra.network.latency')} (ms)`, data: trendRows.value.map(r => r.latency_ms), borderColor: '#f59e0b', backgroundColor: '#f59e0b', yAxisID: 'y1', tension: 0.3 },
    { label: `${t('infra.network.jitter')} (ms)`, data: trendRows.value.map(r => r.jitter_ms), borderColor: '#ef4444', backgroundColor: '#ef4444', yAxisID: 'y1', tension: 0.3 },
  ],
}))
const chartOptions = {
  responsive: true, maintainAspectRatio: false, spanGaps: true,
  scales: {
    y: { position: 'left' as const, title: { display: true, text: 'Mbps' } },
    y1: { position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'ms' } },
  },
}

async function deleteRow(r: any) {
  if (!await confirmDelete(undefined, t('infra.common.deleteTitle'))) return
  await $fetch(`/api/network-checks/${r.id}`, { method: 'DELETE' })
  await Promise.all([fetchHistory(), fetchTrend()])
}
</script>

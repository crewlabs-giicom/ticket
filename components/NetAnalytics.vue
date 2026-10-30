<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <button @click="mode = 'interfaces'" :class="mode === 'interfaces' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.mikrotik.analytics.interfaces') }}</button>
        <button @click="mode = 'subnets'" :class="mode === 'subnets' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.mikrotik.analytics.subnets') }}</button>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="r in RANGE_KEYS" :key="r" @click="range = r"
          :class="range === r ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs"
        >{{ t('infra.mikrotik.analytics.range.' + r) }}</button>
        <button class="btn-secondary py-1 px-3 text-xs" :disabled="!rows.length" @click="exportXlsx">{{ t('infra.mikrotik.analytics.export') }}</button>
        <AppRefreshButton :loading="loading" @click="load()" />
      </div>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{{ error }}</div>
    <div v-if="!loading && data && !rows.length" class="card p-6 text-center text-sm text-slate-400">{{ t('infra.mikrotik.analytics.empty') }}</div>
    <div v-if="!data && loading" class="card p-6 text-center text-sm text-slate-400">{{ t('infra.mikrotik.loading') }}</div>

    <template v-if="data && rows.length">
      <!-- Insight otomatis -->
      <div v-if="data.insights.length" class="card p-4 space-y-1.5">
        <h3 class="text-sm font-semibold text-slate-900 mb-1">{{ t('infra.mikrotik.analytics.insights') }}</h3>
        <div
          v-for="(ins, idx) in data.insights" :key="idx" class="text-sm rounded-lg px-3 py-1.5"
          :class="ins.level === 'crit' ? 'bg-red-50 text-red-700' : ins.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-700'"
        >{{ t('infra.mikrotik.analytics.insight.' + ins.key, ins.params) }}</div>
      </div>
      <div v-else class="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">{{ t('infra.mikrotik.analytics.noIssues') }}</div>

      <!-- KPI -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="k in kpis" :key="k.label" class="card p-3">
          <div class="text-xs text-slate-400">{{ k.label }}</div>
          <div class="text-lg font-semibold text-slate-900">{{ k.value }}</div>
          <div v-if="k.hint" class="text-xs text-slate-500">{{ k.hint }}</div>
        </div>
      </div>

      <!-- Grafik item terpilih -->
      <div class="card p-4">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h3 class="text-sm font-semibold text-slate-900 font-mono">{{ data.selected }}</h3>
          <div class="w-full sm:w-64">
            <AppSelect :model-value="data.selected" :options="selectOptions" @update:model-value="select" />
          </div>
        </div>
        <NetLiveChart :labels="chartLabels" :series="trafficSeries" :height="240" />
        <template v-if="mode === 'subnets'">
          <h4 class="text-xs font-semibold text-slate-500 mt-4 mb-1">{{ t('infra.mikrotik.analytics.onlineTrend') }}</h4>
          <div :style="{ height: '160px' }"><Line :data="onlineData" :options="onlineOptions" /></div>
        </template>
      </div>

      <!-- Heatmap jam sibuk -->
      <div v-if="data.heatmap" class="card p-4">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.mikrotik.analytics.heatmap') }}</h3>
          <span v-if="data.heatmap.busiestHour !== null" class="text-xs text-slate-500">{{ t('infra.mikrotik.analytics.busiestHour') }}: <span class="font-semibold text-slate-900">{{ pad(data.heatmap.busiestHour) }}:00</span></span>
        </div>
        <div class="overflow-x-auto">
          <div class="min-w-[32rem]">
            <div class="flex pl-8 text-[10px] text-slate-400">
              <div v-for="h in 24" :key="h" class="flex-1 text-center">{{ (h - 1) % 3 === 0 ? pad(h - 1) : '' }}</div>
            </div>
            <div v-for="(day, d) in data.heatmap.cells" :key="d" class="flex items-center gap-0.5 mb-0.5">
              <div class="w-8 text-[10px] text-slate-400">{{ DAYS[d] }}</div>
              <div
                v-for="(v, h) in day" :key="h" class="flex-1 h-5 rounded-sm"
                :style="{ backgroundColor: heatColor(v) }" :title="`${DAYS[d]} ${pad(h)}:00 — ${fmtBps(v)}`"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Tabel peringkat -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="text-left px-3 py-2 cursor-pointer" @click="toggleSort('name')">{{ mode === 'interfaces' ? 'Interface' : 'Subnet' }}</th>
                <th v-if="mode === 'subnets'" class="text-left px-3 py-2 hidden md:table-cell">Interface</th>
                <th class="text-right px-3 py-2 cursor-pointer" @click="toggleSort('avg')">{{ t('infra.mikrotik.analytics.avg') }} ↓/↑</th>
                <th class="text-right px-3 py-2 cursor-pointer hidden md:table-cell" @click="toggleSort('peak')">{{ t('infra.mikrotik.peak') }} ↓/↑</th>
                <th class="text-right px-3 py-2 hidden lg:table-cell">p95 ↓/↑</th>
                <th class="text-right px-3 py-2 cursor-pointer" @click="toggleSort('total')">{{ t('infra.mikrotik.total') }}</th>
                <template v-if="mode === 'interfaces'">
                  <th class="text-right px-3 py-2 hidden md:table-cell cursor-pointer" @click="toggleSort('errors')">{{ t('infra.mikrotik.analytics.errors') }}</th>
                  <th class="text-right px-3 py-2 hidden md:table-cell">{{ t('infra.mikrotik.analytics.drops') }}</th>
                  <th class="text-right px-3 py-2 hidden lg:table-cell">{{ t('infra.mikrotik.linkDowns') }}</th>
                </template>
                <template v-else>
                  <th class="text-right px-3 py-2 cursor-pointer" @click="toggleSort('online')">{{ t('infra.mikrotik.analytics.onlinePeak') }}</th>
                  <th class="text-right px-3 py-2 hidden md:table-cell">{{ t('infra.mikrotik.analytics.occupancy') }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in pagedRows" :key="r.key" class="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                :class="r.key === data.selected ? 'bg-indigo-50/60' : ''" @click="select(r.key)"
              >
                <td class="px-3 py-2 font-mono font-medium text-slate-900">{{ r.key }}</td>
                <td v-if="mode === 'subnets'" class="px-3 py-2 text-slate-500 hidden md:table-cell">{{ r.interface }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">{{ fmtBps(r.summary.rxAvg) }} / {{ fmtBps(r.summary.txAvg) }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap hidden md:table-cell">{{ fmtBps(r.summary.rxPeak) }} / {{ fmtBps(r.summary.txPeak) }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap hidden lg:table-cell">{{ fmtBps(r.summary.rxP95) }} / {{ fmtBps(r.summary.txP95) }}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">{{ fmtBytes(r.summary.rxBytes + r.summary.txBytes) }}</td>
                <template v-if="mode === 'interfaces'">
                  <td class="px-3 py-2 text-right hidden md:table-cell" :class="r.errors ? 'text-red-600 font-semibold' : 'text-slate-400'">{{ r.errors }}</td>
                  <td class="px-3 py-2 text-right hidden md:table-cell" :class="r.drops ? 'text-amber-600 font-semibold' : 'text-slate-400'">{{ r.drops }}</td>
                  <td class="px-3 py-2 text-right hidden lg:table-cell" :class="r.linkDowns ? 'text-red-600 font-semibold' : 'text-slate-400'">{{ r.linkDowns }}</td>
                </template>
                <template v-else>
                  <td class="px-3 py-2 text-right">{{ r.onlinePeak }}</td>
                  <td class="px-3 py-2 text-right hidden md:table-cell" :class="r.occupancyPct >= 80 ? 'text-amber-600 font-semibold' : ''">{{ r.total }}/{{ r.capacity }} ({{ r.occupancyPct }}%)</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :page="page" :total-pages="totalPages" :total="rows.length" :limit="limit" @page-change="page = $event" @limit-change="limit = $event; page = 1" />
      </div>

      <!-- Riwayat WAN -->
      <div v-if="mode === 'interfaces' && data.availability.length" class="card p-4 space-y-3">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.mikrotik.analytics.wanHistory') }}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="a in data.availability" :key="a.name" class="rounded-lg bg-slate-50 p-3 text-xs">
            <div class="text-sm font-semibold text-slate-900">{{ a.name }}</div>
            <div class="text-lg font-semibold" :class="a.availabilityPct < 99 ? 'text-red-600' : 'text-green-700'">{{ a.availabilityPct.toFixed(2) }}%</div>
            <div class="text-slate-500">{{ a.incidents }} {{ t('infra.mikrotik.analytics.incidents') }} · {{ t('infra.mikrotik.analytics.down') }} {{ fmtDur(a.downMs) }} · MTTR {{ a.mttrMs ? fmtDur(a.mttrMs) : '—' }}</div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="text-slate-500"><tr>
              <th class="text-left py-1">WAN</th><th class="text-left py-1">{{ t('infra.mikrotik.analytics.wentDown') }}</th>
              <th class="text-left py-1">{{ t('infra.mikrotik.analytics.recovered') }}</th><th class="text-right py-1">{{ t('infra.mikrotik.analytics.duration') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="(e, i) in data.events.slice(0, 20)" :key="i" class="border-t border-slate-100">
                <td class="py-1 font-medium text-slate-900">{{ e.interface_name }}</td>
                <td class="py-1">{{ new Date(e.went_down_at).toLocaleString('id-ID') }}</td>
                <td class="py-1">{{ e.recovered_at ? new Date(e.recovered_at).toLocaleString('id-ID') : t('infra.mikrotik.analytics.ongoing') }}</td>
                <td class="py-1 text-right">{{ fmtDur((e.recovered_at ?? Date.now()) - e.went_down_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const { t } = useI18n()

type Mode = 'interfaces' | 'subnets'
const RANGE_KEYS = ['1h', '24h', '7d', '30d'] as const
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const mode = ref<Mode>('interfaces')
const range = ref<typeof RANGE_KEYS[number]>('24h')
const selectedKey = ref('')
const loading = ref(false)
const error = ref('')
const data = ref<any>(null)

async function load() {
  loading.value = true
  try {
    const param = mode.value === 'interfaces' ? 'name' : 'cidr'
    data.value = await $fetch(`/api/network/analytics/${mode.value}`, { query: { range: range.value, [param]: selectedKey.value || undefined } })
    selectedKey.value = data.value.selected
    error.value = ''
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.statusMessage || e?.message || t('infra.mikrotik.errorGeneric')
  } finally {
    loading.value = false
  }
}
watch(mode, () => { selectedKey.value = ''; data.value = null; page.value = 1; load() })
watch(range, () => load())
onMounted(load)
function select(key: string) { selectedKey.value = key; load() }

// ---- baris tabel (seragam untuk interface & subnet) ----
const rows = computed<any[]>(() => (data.value?.items || []).map((i: any) => ({ ...i, key: i.name ?? i.cidr, onlinePeak: i.onlinePeak ?? 0, occupancyPct: i.occupancyPct ?? 0 })))
const sortKey = ref<'name' | 'avg' | 'peak' | 'total' | 'errors' | 'online'>('total')
const sortDir = ref<'asc' | 'desc'>('desc')
function toggleSort(k: typeof sortKey.value) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = k; sortDir.value = k === 'name' ? 'asc' : 'desc' }
}
const sortedRows = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  const val = (r: any) => {
    switch (sortKey.value) {
      case 'name': return r.key
      case 'avg': return r.summary.rxAvg + r.summary.txAvg
      case 'peak': return r.summary.rxPeak + r.summary.txPeak
      case 'errors': return (r.errors || 0) + (r.drops || 0)
      case 'online': return r.onlinePeak
      default: return r.summary.rxBytes + r.summary.txBytes
    }
  }
  return [...rows.value].sort((a, b) => {
    const x = val(a), y = val(b)
    return dir * (typeof x === 'string' ? x.localeCompare(y, 'en', { numeric: true }) : x - y)
  })
})
const page = ref(1)
const limit = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / limit.value)))
const pagedRows = computed(() => sortedRows.value.slice((page.value - 1) * limit.value, page.value * limit.value))
const selectOptions = computed(() => rows.value.map(r => ({ value: r.key, label: r.key })))

// ---- KPI ----
const kpis = computed(() => {
  const rs = rows.value
  if (!rs.length) return []
  const totalBytes = rs.reduce((a, r) => a + r.summary.rxBytes + r.summary.txBytes, 0)
  const peak = Math.max(...rs.map(r => r.summary.rxPeak + r.summary.txPeak))
  const p95 = Math.max(...rs.map(r => r.summary.rxP95 + r.summary.txP95))
  if (mode.value === 'interfaces') {
    const av: any[] = data.value.availability
    const worst = av.length ? Math.min(...av.map(a => a.availabilityPct)) : 100
    return [
      { label: t('infra.mikrotik.analytics.kpi.traffic'), value: fmtBytes(totalBytes), hint: t('infra.mikrotik.analytics.kpi.allIfaces') },
      { label: t('infra.mikrotik.analytics.kpi.peak'), value: fmtBps(peak), hint: `p95 ${fmtBps(p95)}` },
      { label: t('infra.mikrotik.analytics.kpi.availability'), value: `${worst.toFixed(2)}%`, hint: av.length ? t('infra.mikrotik.analytics.kpi.worstWan') : t('infra.mikrotik.analytics.kpi.noIncident') },
      { label: t('infra.mikrotik.analytics.kpi.errDrops'), value: String(rs.reduce((a, r) => a + r.errors + r.drops, 0)), hint: `${rs.reduce((a, r) => a + r.linkDowns, 0)} link down` },
    ]
  }
  return [
    { label: t('infra.mikrotik.analytics.kpi.traffic'), value: fmtBytes(totalBytes), hint: t('infra.mikrotik.analytics.kpi.allSubnets') },
    { label: t('infra.mikrotik.analytics.kpi.peak'), value: fmtBps(peak), hint: `p95 ${fmtBps(p95)}` },
    { label: t('infra.mikrotik.analytics.kpi.onlinePeak'), value: String(Math.max(...rs.map(r => r.onlinePeak))), hint: `${rs.length} subnet` },
    { label: t('infra.mikrotik.analytics.occupancy'), value: `${Math.max(...rs.map(r => r.occupancyPct))}%`, hint: t('infra.mikrotik.analytics.kpi.fullest') },
  ]
})

// ---- grafik ----
const chartLabels = computed(() => (data.value?.series || []).map((p: any) => fmtLabel(p.ts)))
const trafficSeries = computed(() => [
  { label: '↓ rx', color: '#2563eb', data: (data.value?.series || []).map((p: any) => p.rxAvg), fill: true },
  { label: '↑ tx', color: '#f97316', data: (data.value?.series || []).map((p: any) => p.txAvg), fill: true },
  { label: `${t('infra.mikrotik.peak')} ↓`, color: '#2563eb', data: (data.value?.series || []).map((p: any) => p.rxMax), dashed: true },
  { label: `${t('infra.mikrotik.peak')} ↑`, color: '#f97316', data: (data.value?.series || []).map((p: any) => p.txMax), dashed: true },
])
const onlineData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: t('infra.mikrotik.online'), data: (data.value?.series || []).map((p: any) => p.onlineMax),
    borderColor: '#16a34a', backgroundColor: '#16a34a26', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
  }],
}))
const onlineOptions = {
  responsive: true, maintainAspectRatio: false, animation: false as const,
  plugins: { legend: { display: false } },
  scales: { x: { ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5, font: { size: 10 } } } },
}
function fmtLabel(ms: number) {
  const d = new Date(ms)
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  return range.value === '1h' || range.value === '24h' ? time : `${d.getDate()}/${d.getMonth() + 1} ${time}`
}
function heatColor(v: number) {
  const max = data.value?.heatmap?.max || 0
  if (!max || !v) return 'rgb(241 245 249)'
  return `rgba(79, 70, 229, ${(0.12 + 0.88 * (v / max)).toFixed(2)})`
}

// ---- format ----
const pad = (n: number) => String(n).padStart(2, '0')
function fmtBps(v: number | null) {
  if (v === null || v === undefined) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Gbps`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mbps`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} Kbps`
  return `${Math.round(v)} bps`
}
function fmtBytes(v: number) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0, n = v
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`
}
function fmtDur(ms: number) {
  const m = Math.round(ms / 60000)
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}

// ---- export ----
async function exportXlsx() {
  const XLSX = await import('xlsx')
  const isIf = mode.value === 'interfaces'
  const sheet = rows.value.map(r => ({
    [isIf ? 'Interface' : 'Subnet']: r.key,
    ...(isIf ? {} : { Interface: r.interface }),
    'Avg rx (bps)': Math.round(r.summary.rxAvg), 'Avg tx (bps)': Math.round(r.summary.txAvg),
    'Peak rx (bps)': Math.round(r.summary.rxPeak), 'Peak tx (bps)': Math.round(r.summary.txPeak),
    'p95 rx (bps)': Math.round(r.summary.rxP95), 'p95 tx (bps)': Math.round(r.summary.txP95),
    'Total bytes': Math.round(r.summary.rxBytes + r.summary.txBytes),
    ...(isIf
      ? { Errors: r.errors, Drops: r.drops, 'Link downs': r.linkDowns }
      : { 'Online peak': r.onlinePeak, Clients: r.total, Capacity: r.capacity, 'Occupancy %': r.occupancyPct }),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), mode.value)
  XLSX.writeFile(wb, `network-analytics-${mode.value}-${range.value}.xlsx`)
}
</script>

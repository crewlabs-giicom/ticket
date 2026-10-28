<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-sm text-slate-500">{{ t('infra.mikrotik.subtitle') }}</p>
      <div class="flex items-center gap-3">
        <span v-if="fetchedAt" class="text-xs text-slate-400">{{ t('infra.mikrotik.updated') }} {{ fmtTime(fetchedAt) }}</span>
        <AppRefreshButton :loading="loading" @click="loadActive()" />
      </div>
    </div>

    <div v-if="mock" class="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
      {{ t('infra.mikrotik.mockBanner') }}
    </div>
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
      {{ error }}
    </div>

    <div class="flex items-center gap-2">
      <button @click="tab = 'interfaces'" :class="tab === 'interfaces' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.mikrotik.tabInterfaces') }}</button>
      <button @click="tab = 'clients'" :class="tab === 'clients' ? 'btn-primary' : 'btn-secondary'" class="py-1 px-3 text-xs">{{ t('infra.mikrotik.tabClients') }}</button>
    </div>

    <!-- Tab Interface -->
    <template v-if="tab === 'interfaces'">
      <div v-if="ifaces" class="text-sm text-slate-600">
        {{ t('infra.mikrotik.wanUp') }}: <span class="font-semibold text-slate-900">{{ wanUp }}/{{ wanTotal }}</span>
      </div>
      <div v-if="!ifaces && loading" class="card p-6 text-center text-sm text-slate-400">{{ t('infra.mikrotik.loading') }}</div>
      <div v-if="ifaces" class="space-y-3">
        <div class="card p-4">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.mikrotik.chartWanTotal') }}</h3>
            <div class="text-xs text-slate-500">↓ <span class="font-semibold text-slate-900">{{ fmtBps(wanNow.rx) }}</span> · ↑ <span class="font-semibold text-slate-900">{{ fmtBps(wanNow.tx) }}</span></div>
          </div>
          <NetLiveChart :labels="history.labels" :series="wanTotalSeries" :height="220" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="card p-4">
            <h3 class="text-sm font-semibold text-slate-900 mb-2">{{ t('infra.mikrotik.chartWanDown') }}</h3>
            <NetLiveChart :labels="history.labels" :series="wanPerSeries('rx')" :height="200" />
          </div>
          <div class="card p-4">
            <h3 class="text-sm font-semibold text-slate-900 mb-2">{{ t('infra.mikrotik.chartWanUp') }}</h3>
            <NetLiveChart :labels="history.labels" :series="wanPerSeries('tx')" :height="200" />
          </div>
        </div>
      </div>
      <template v-for="g in ifaceGroups" :key="g.role">
        <div v-if="g.items.length" class="space-y-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ g.label }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in g.items" :key="i.id" class="card p-4 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-900">{{ i.name }} <span class="text-xs font-normal text-slate-400">{{ i.type }}</span></div>
                  <div class="text-xs text-slate-500 truncate" :title="i.comment">{{ i.comment || '—' }}</div>
                </div>
                <span class="badge" :class="statusClass(i)">{{ statusLabel(i) }}</span>
              </div>
              <div class="text-xs text-slate-500 font-mono">{{ i.addresses.length ? i.addresses.join(', ') : '—' }}</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-slate-50 p-2">
                  <div class="text-slate-400">{{ i.role === 'WAN' ? '↓ ' + t('infra.mikrotik.download') : '↓ rx' }}</div>
                  <div class="font-semibold text-slate-900">{{ fmtBps(i.rxBps) }}</div>
                </div>
                <div class="rounded-lg bg-slate-50 p-2">
                  <div class="text-slate-400">{{ i.role === 'WAN' ? '↑ ' + t('infra.mikrotik.upload') : '↑ tx' }}</div>
                  <div class="font-semibold text-slate-900">{{ fmtBps(i.txBps) }}</div>
                </div>
              </div>
              <NetLiveChart v-if="i.running && !i.disabled" :labels="history.labels" :series="ifaceSeries(i.name)" :height="48" compact />
              <div class="flex items-center justify-between text-xs text-slate-500">
                <span>{{ t('infra.mikrotik.total') }}: ↓ {{ fmtBytes(i.rxBytes) }} · ↑ {{ fmtBytes(i.txBytes) }}</span>
                <span :title="i.lastLinkUp || ''">{{ t('infra.mikrotik.linkDowns') }}: {{ i.linkDowns ?? '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Tab Klien per Subnet -->
    <template v-else>
      <div v-if="clients" class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap text-xs">
          <span class="badge bg-slate-100 text-slate-700">{{ t('infra.mikrotik.totalClients') }}: {{ clients.summary.total }}</span>
          <span class="badge bg-green-100 text-green-700">{{ t('infra.mikrotik.online') }}: {{ clients.summary.online }}</span>
          <span v-for="(n, j) in clients.summary.perJalur" :key="j" class="badge" :class="jalurClass(j)">{{ j }}: {{ n }}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <input v-model="search" class="input flex-1 min-w-[12rem] sm:flex-none sm:w-64" :placeholder="t('infra.mikrotik.searchPlaceholder')" />
          <div class="w-full sm:w-56">
            <AppSelect v-model="jalurFilter" :options="jalurOptions" />
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input v-model="onlyOnline" type="checkbox" class="rounded border-slate-300" /> {{ t('infra.mikrotik.onlyOnline') }}
          </label>
        </div>
      </div>
      <div v-if="!clients && loading" class="card p-6 text-center text-sm text-slate-400">{{ t('infra.mikrotik.loading') }}</div>

      <div v-if="lanNames.length" class="card p-4">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('infra.mikrotik.chartLan') }}</h3>
          <div class="text-xs text-slate-500">{{ t('infra.mikrotik.toClients') }} <span class="font-semibold text-slate-900">{{ fmtBps(lanNow.tx) }}</span> · {{ t('infra.mikrotik.fromClients') }} <span class="font-semibold text-slate-900">{{ fmtBps(lanNow.rx) }}</span></div>
        </div>
        <NetLiveChart :labels="history.labels" :series="lanSeries" :height="200" />
      </div>

      <div v-for="s in visibleSubnets" :key="s.cidr" class="card overflow-hidden">
        <button class="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50" @click="toggle(s.cidr)">
          <div class="min-w-0">
            <span class="text-sm font-semibold text-slate-900 font-mono">{{ s.cidr }}</span>
            <span class="text-xs text-slate-500 ml-2">{{ s.interface }}<template v-if="s.interfaceComment"> · {{ s.interfaceComment }}</template></span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div v-if="history.tx[s.interface]" class="w-24 hidden sm:block"><NetLiveChart :labels="history.labels" :series="ifaceSeries(s.interface, true)" :height="28" compact /></div>
            <span class="text-xs text-slate-600">{{ s.online }}/{{ s.total }} {{ t('infra.mikrotik.online').toLowerCase() }}</span>
            <span class="text-slate-400 text-xs">{{ collapsed[s.cidr] ? '▸' : '▾' }}</span>
          </div>
        </button>
        <ClientTable v-if="!collapsed[s.cidr]" :rows="s.rows" :t="t" :jalur-class="jalurClass" />
      </div>

      <div v-if="unassignedRows.length" class="card overflow-hidden">
        <button class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50" @click="toggle('__unassigned')">
          <span class="text-sm font-semibold text-slate-900">{{ t('infra.mikrotik.outsideSubnet') }}</span>
          <span class="text-xs text-slate-600">{{ unassignedRows.length }} <span class="text-slate-400 ml-2">{{ collapsed['__unassigned'] ? '▸' : '▾' }}</span></span>
        </button>
        <ClientTable v-if="!collapsed['__unassigned']" :rows="unassignedRows" :t="t" :jalur-class="jalurClass" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, defineComponent, type PropType } from 'vue'
import type { InterfaceView, ClientView, SubnetView } from '~/server/utils/mikrotik/logic'

definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()

if (auth.user?.role !== 'admin') await navigateTo('/')

const tab = ref<'interfaces' | 'clients'>('interfaces')
const loading = ref(false)
const error = ref('')
const mock = ref(false)
const fetchedAt = ref('')

const ifaces = ref<{ interfaces: InterfaceView[] } | null>(null)

// Riwayat bandwidth hanya di memori browser (rolling 2 menit, 1 sampel/dtk); tidak disimpan di server/DB.
const HISTORY_MAX = 120
const history = reactive<{ labels: string[]; rx: Record<string, Array<number | null>>; tx: Record<string, Array<number | null>> }>({ labels: [], rx: {}, tx: {} })
interface TrafficSample { name: string; rxBps: number | null; txBps: number | null }
function pushHistory(list: TrafficSample[], iso: string) {
  history.labels.push(new Date(iso).toLocaleTimeString('id-ID', { hour12: false }))
  const len = history.labels.length
  const seen = new Set<string>()
  for (const i of list) {
    seen.add(i.name)
    const rx = (history.rx[i.name] ||= new Array(len - 1).fill(null))
    const tx = (history.tx[i.name] ||= new Array(len - 1).fill(null))
    rx.push(i.rxBps); tx.push(i.txBps)
  }
  for (const n of Object.keys(history.rx)) if (!seen.has(n)) { history.rx[n].push(null); history.tx[n].push(null) }
  if (len > HISTORY_MAX) {
    history.labels.shift()
    for (const n of Object.keys(history.rx)) { history.rx[n].shift(); history.tx[n].shift() }
  }
}
const clients = ref<{ subnets: SubnetView[]; unassigned: ClientView[]; summary: { total: number; online: number; perJalur: Record<string, number> } } | null>(null)

async function load(kind: 'interfaces' | 'clients') {
  loading.value = true
  try {
    const res: any = await $fetch(`/api/network/${kind}`)
    if (kind === 'interfaces') { ifaces.value = res; applyTraffic() }
    else clients.value = res
    mock.value = !!res.mock
    fetchedAt.value = res.fetchedAt
    error.value = ''
  } catch (e: any) {
    // data lama tetap tampil; halaman pulih sendiri di refresh berikutnya
    error.value = e?.data?.message || e?.data?.statusMessage || e?.message || t('infra.mikrotik.errorGeneric')
  } finally {
    loading.value = false
  }
}
const loadActive = () => load(tab.value)

// Bandwidth live: endpoint ringan, ~1 dtk. Nilai terbaru juga dipakai kartu interface.
const latestTraffic = new Map<string, TrafficSample>()
function applyTraffic() {
  for (const i of ifaces.value?.interfaces || []) {
    const t = latestTraffic.get(i.name)
    if (t && i.running && !i.disabled) { i.rxBps = t.rxBps; i.txBps = t.txBps }
  }
}
let trafficBusy = false
async function loadTraffic() {
  if (trafficBusy || (typeof document !== 'undefined' && document.hidden)) return // jangan menumpuk kalau router lambat; hemat saat tab tersembunyi
  trafficBusy = true
  try {
    const res: any = await $fetch('/api/network/traffic')
    const byName = new Map<string, TrafficSample>((res.traffic as TrafficSample[]).map(x => [x.name, x]))
    latestTraffic.clear(); byName.forEach((v, k) => latestTraffic.set(k, v))
    // semua interface yang dikenal: tanpa data trafik (down/disabled) dicatat null
    const names = new Set([...Object.keys(history.rx), ...byName.keys(), ...(ifaces.value?.interfaces || []).map(i => i.name)])
    pushHistory([...names].map(n => byName.get(n) || { name: n, rxBps: null, txBps: null }), res.fetchedAt)
    applyTraffic()
    mock.value = !!res.mock
    fetchedAt.value = res.fetchedAt
    error.value = ''
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.statusMessage || e?.message || t('infra.mikrotik.errorGeneric')
  } finally {
    trafficBusy = false
  }
}

// Bandwidth tiap 1 dtk (selalu, supaya grafik tetap berjalan di kedua tab); status interface tiap 5 dtk;
// klien tiap 30 dtk hanya saat tab Klien aktif.
const trafficPoll = useIntervalFn(loadTraffic, 1000, { immediate: false })
const ifacePoll = useIntervalFn(() => load('interfaces'), 5000, { immediate: false })
const clientPoll = useIntervalFn(() => load('clients'), 30000, { immediate: false })
watch(tab, (v) => {
  if (v === 'clients') { load('clients'); clientPoll.resume() }
  else clientPoll.pause()
})
onMounted(() => { load('interfaces'); loadTraffic(); ifacePoll.resume(); trafficPoll.resume() })

// ---- Interface ----
const ROLE_LABEL = computed<Record<string, string>>(() => ({ WAN: 'WAN', LAN: 'LAN', LAINNYA: t('infra.mikrotik.others') }))
const ifaceGroups = computed(() => (['WAN', 'LAN', 'LAINNYA'] as const).map(role => ({
  role, label: ROLE_LABEL.value[role], items: (ifaces.value?.interfaces || []).filter(i => i.role === role),
})))
const wanTotal = computed(() => (ifaces.value?.interfaces || []).filter(i => i.role === 'WAN' && !i.disabled).length)
const wanUp = computed(() => (ifaces.value?.interfaces || []).filter(i => i.role === 'WAN' && !i.disabled && i.running).length)

const COLORS = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777']
const wanNames = computed(() => (ifaces.value?.interfaces || []).filter(i => i.role === 'WAN' && !i.disabled).map(i => i.name))
const lanNames = computed(() => (ifaces.value?.interfaces || []).filter(i => i.role === 'LAN' && !i.disabled).map(i => i.name))
function sumSeries(names: string[], dir: 'rx' | 'tx') {
  return history.labels.map((_, idx) => {
    let sum = 0, any = false
    for (const n of names) { const v = history[dir][n]?.[idx]; if (v !== null && v !== undefined) { sum += v; any = true } }
    return any ? sum : null
  })
}
const wanTotalSeries = computed(() => [
  { label: '↓ ' + t('infra.mikrotik.download'), color: '#2563eb', data: sumSeries(wanNames.value, 'rx'), fill: true },
  { label: '↑ ' + t('infra.mikrotik.upload'), color: '#f97316', data: sumSeries(wanNames.value, 'tx'), fill: true },
])
const wanPerSeries = (dir: 'rx' | 'tx') => wanNames.value.map((n, i) => ({ label: n, color: COLORS[i % COLORS.length], data: history[dir][n] || [] }))
const lanSeries = computed(() => [
  { label: t('infra.mikrotik.toClients'), color: '#16a34a', data: sumSeries(lanNames.value, 'tx'), fill: true },
  { label: t('infra.mikrotik.fromClients'), color: '#9333ea', data: sumSeries(lanNames.value, 'rx'), fill: true },
])
const ifaceSeries = (name: string, onlyTx = false) => [
  ...(onlyTx ? [] : [{ label: 'rx', color: '#2563eb', data: history.rx[name] || [] }]),
  { label: 'tx', color: onlyTx ? '#16a34a' : '#f97316', data: history.tx[name] || [] },
]
const lastOf = (a: Array<number | null>) => (a.length ? a[a.length - 1] ?? 0 : 0)
const wanNow = computed(() => ({ rx: lastOf(sumSeries(wanNames.value, 'rx')), tx: lastOf(sumSeries(wanNames.value, 'tx')) }))
const lanNow = computed(() => ({ rx: lastOf(sumSeries(lanNames.value, 'rx')), tx: lastOf(sumSeries(lanNames.value, 'tx')) }))

const statusLabel = (i: InterfaceView) => i.disabled ? t('infra.mikrotik.disabled') : i.running ? 'Up' : 'Down'
const statusClass = (i: InterfaceView) => i.disabled ? 'bg-slate-100 text-slate-500' : i.running ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

function fmtBps(v: number | null) {
  if (v === null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Gbps`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mbps`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} Kbps`
  return `${v} bps`
}
function fmtBytes(v: number | null) {
  if (v === null) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0, n = v
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`
}
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID')

// ---- Klien ----
const search = ref('')
const onlyOnline = ref(false)
const jalurFilter = ref('')
const collapsed = ref<Record<string, boolean>>({})
const toggle = (k: string) => { collapsed.value[k] = !collapsed.value[k] }

const jalurOptions = computed(() => [
  { value: '', label: t('infra.mikrotik.allJalur') },
  ...Object.keys(clients.value?.summary.perJalur || {}).map(j => ({ value: j, label: j })),
])
function jalurClass(j: string) {
  if (j.startsWith('YESNET')) return 'bg-blue-100 text-blue-700'
  if (j.includes('INDIHOME')) return 'bg-red-100 text-red-700'
  if (j.includes('XL')) return 'bg-purple-100 text-purple-700'
  if (j.includes('BIZNET')) return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-700'
}
function matches(c: ClientView) {
  if (onlyOnline.value && !c.online) return false
  if (jalurFilter.value && c.jalur !== jalurFilter.value) return false
  const q = search.value.trim().toLowerCase()
  return !q || c.ip.includes(q) || c.hostname.toLowerCase().includes(q) || c.mac.toLowerCase().includes(q)
}
const filtering = computed(() => !!(search.value.trim() || onlyOnline.value || jalurFilter.value))
const visibleSubnets = computed(() => (clients.value?.subnets || [])
  .map(s => ({ ...s, rows: s.clients.filter(matches) }))
  .filter(s => !filtering.value || s.rows.length))
const unassignedRows = computed(() => (clients.value?.unassigned || []).filter(matches))

const ClientTable = defineComponent({
  props: {
    rows: { type: Array as PropType<ClientView[]>, required: true },
    t: { type: Function as PropType<(k: string) => string>, required: true },
    jalurClass: { type: Function as PropType<(j: string) => string>, required: true },
  },
  setup(props) {
    return () => {
      const th = (k: string, cls = '') => h('th', { class: `text-left px-3 py-2 ${cls}` }, props.t(k))
      const dhcp = (c: ClientView) => c.dhcpStatic === null ? '–' : c.dhcpStatic ? 'static' : 'dynamic'
      return h('div', { class: 'overflow-x-auto border-t border-slate-100' }, [
        h('table', { class: 'w-full text-sm' }, [
          h('thead', { class: 'bg-slate-50 text-xs text-slate-500' }, h('tr', [
            th('infra.mikrotik.col.status'), th('infra.mikrotik.col.ip'), th('infra.mikrotik.col.hostname'),
            th('infra.mikrotik.col.mac', 'hidden md:table-cell'), th('infra.mikrotik.col.jalur'),
            th('infra.mikrotik.col.dhcp', 'hidden md:table-cell'), th('infra.mikrotik.col.lastSeen', 'hidden lg:table-cell'),
            th('infra.mikrotik.col.comment', 'hidden lg:table-cell'),
          ])),
          h('tbody', { class: 'divide-y divide-slate-100' }, props.rows.length
            ? props.rows.map(c => h('tr', { key: c.ip }, [
              h('td', { class: 'px-3 py-2' }, h('span', { class: `inline-block w-2 h-2 rounded-full ${c.online ? 'bg-green-500' : 'bg-slate-300'}`, title: c.online ? 'Online' : 'Offline' })),
              h('td', { class: 'px-3 py-2 font-mono text-xs' }, c.ip),
              h('td', { class: 'px-3 py-2' }, c.hostname || '—'),
              h('td', { class: 'px-3 py-2 font-mono text-xs hidden md:table-cell' }, c.mac || '—'),
              h('td', { class: 'px-3 py-2' }, h('span', {
                class: `badge ${props.jalurClass(c.jalur)}`,
                title: c.jalurConflict.length ? `${props.t('infra.mikrotik.alsoIn')}: ${c.jalurConflict.filter(x => x !== c.jalurList).join(', ')}. ${props.t('infra.mikrotik.effective')}: ${c.jalurList}` : undefined,
              }, `${c.jalurConflict.length ? '⚠ ' : ''}${c.jalur}`)),
              h('td', { class: 'px-3 py-2 text-xs hidden md:table-cell' }, dhcp(c)),
              h('td', { class: 'px-3 py-2 text-xs text-slate-500 hidden lg:table-cell' }, c.lastSeen || '—'),
              h('td', { class: 'px-3 py-2 text-xs text-slate-500 hidden lg:table-cell' }, c.comment || '—'),
            ]))
            : [h('tr', h('td', { class: 'px-3 py-4 text-center text-xs text-slate-400', colspan: 8 }, props.t('infra.mikrotik.noClients')))]),
        ]),
      ])
    }
  },
})
</script>

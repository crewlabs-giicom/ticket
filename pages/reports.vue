<template>
  <div class="space-y-5">
    <!-- Filters -->
    <div class="card p-4 flex flex-wrap items-end gap-3">
      <div><label class="label text-xs">Dari</label><input v-model="filters.from" type="date" class="input text-sm w-36" /></div>
      <div><label class="label text-xs">Sampai</label><input v-model="filters.to" type="date" class="input text-sm w-36" /></div>
      <div><label class="label text-xs">Project</label>
        <select v-model="filters.project_id" class="input text-sm w-36">
          <option value="">Semua</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div><label class="label text-xs">Staff</label>
        <select v-model="filters.staff_id" class="input text-sm w-36">
          <option value="">Semua</option>
          <option v-for="u in staff" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
      <button @click="fetchReport" class="btn-primary">Tampilkan</button>
    </div>

    <div v-if="d">
      <!-- Time report summary -->
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Report Time — SLA & Durasi</h3>
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div class="stat-card"><span class="text-xs text-slate-500">Total Ticket</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.total ?? 0 }}</span></div>
        <div class="stat-card"><span class="text-xs text-slate-500">Avg First Response</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.avg_first_response_hrs ?? '-' }}j</span></div>
        <div class="stat-card"><span class="text-xs text-slate-500">Avg Resolusi</span><span class="text-2xl font-bold text-slate-900">{{ d.timeReport?.avg_resolution_hrs ?? '-' }}j</span></div>
        <div class="stat-card border-l-4 border-l-green-400"><span class="text-xs text-slate-500">SLA Terpenuhi</span><span class="text-2xl font-bold text-green-600">{{ d.timeReport?.sla_met ?? 0 }}</span><span class="text-xs text-slate-400">{{ d.timeReport?.sla_met_pct ?? 0 }}%</span></div>
        <div class="stat-card border-l-4 border-l-red-400"><span class="text-xs text-slate-500">SLA Breach</span><span class="text-2xl font-bold text-red-600">{{ d.timeReport?.sla_breach ?? 0 }}</span><span class="text-xs text-slate-400">{{ d.timeReport?.sla_met_pct ? (100 - d.timeReport.sla_met_pct).toFixed(1) : 0 }}%</span></div>
      </div>

      <!-- SLA per priority -->
      <div class="card p-5 mb-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-3">SLA Breach per Priority</h3>
        <div class="space-y-3">
          <div v-for="p in d.byPriorityTime" :key="p.name" class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: p.color }" />
            <span class="text-sm text-slate-700 w-24 flex-shrink-0">{{ p.name }}</span>
            <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" :style="{ width: p.total ? (p.sla_breach / p.total * 100) + '%' : '0%', background: p.color }" />
            </div>
            <span class="text-xs text-slate-500 w-28 text-right flex-shrink-0">{{ p.sla_breach }}/{{ p.total }} breach · avg {{ p.avg_hrs ?? '-' }}j</span>
          </div>
        </div>
      </div>

      <!-- Work report -->
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Report Work — Volume & Produktivitas</h3>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <!-- Daily trend -->
        <div class="card p-5">
          <h4 class="text-sm font-semibold text-slate-900 mb-3">Tren Harian</h4>
          <div class="h-52">
            <Bar v-if="trendData" :data="trendData" :options="barOpts" />
          </div>
        </div>
        <!-- By status -->
        <div class="card p-5">
          <h4 class="text-sm font-semibold text-slate-900 mb-3">Per Status</h4>
          <div class="h-52">
            <Doughnut v-if="statusData" :data="statusData" :options="donutOpts" />
          </div>
        </div>
      </div>

      <!-- Per staff table -->
      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <h3 class="text-sm font-semibold text-slate-900">Produktivitas per Staff</h3>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Staff</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resolved</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">SLA Breach</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rate Selesai</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!d.byStaff?.length"><td colspan="5" class="text-center py-6 text-slate-400 text-xs">Tidak ada data</td></tr>
            <tr v-for="s in d.byStaff" :key="s.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">{{ s.name?.charAt(0) }}</div>
                  <span class="text-sm font-medium text-slate-900">{{ s.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ s.total }}</td>
              <td class="px-4 py-3 text-sm text-green-600 font-medium">{{ s.resolved }}</td>
              <td class="px-4 py-3"><span :class="['text-sm font-medium', s.sla_breach > 0 ? 'text-red-600' : 'text-slate-400']">{{ s.sla_breach }}</span></td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-green-500 rounded-full" :style="{ width: s.total ? (s.resolved / s.total * 100) + '%' : '0%' }" />
                  </div>
                  <span class="text-xs text-slate-500 w-8">{{ s.total ? Math.round(s.resolved / s.total * 100) : 0 }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)
definePageMeta({ middleware: 'auth' })

const now = new Date()
const filters = reactive({
  from: new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10),
  to: now.toISOString().slice(0, 10),
  project_id: '',
  staff_id: '',
  priority_id: ''
})

const { data: pd } = await useFetch('/api/projects')
const { data: ud } = await useFetch('/api/users')
const projects = computed(() => (pd.value as any)?.data || [])
const staff = computed(() => ((ud.value as any)?.data || []).filter((u: any) => u.role !== 'customer'))

const d = ref<any>(null)

async function fetchReport() {
  const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  const res = await $fetch('/api/reports', { query: q }) as any
  d.value = res.data
}

await fetchReport()

const trendData = computed(() => {
  const t = d.value?.dailyTrend || []
  return {
    labels: t.map((x: any) => x.date?.slice(5)),
    datasets: [
      { label: 'Masuk', data: t.map((x: any) => x.created), backgroundColor: '#6366f180' },
      { label: 'Resolved', data: t.map((x: any) => x.resolved), backgroundColor: '#22c55e80' }
    ]
  }
})

const statusData = computed(() => {
  const s = d.value?.byStatus || []
  return { labels: s.map((x: any) => x.name), datasets: [{ data: s.map((x: any) => x.count), backgroundColor: s.map((x: any) => x.color), borderWidth: 0 }] }
})

const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 10 } } } }
</script>

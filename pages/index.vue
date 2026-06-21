<template>
  <div class="space-y-6">
    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <span class="text-xs text-slate-500">Ticket Masuk Hari Ini</span>
        <span class="text-2xl font-bold text-slate-900">{{ d?.stats?.tickets_today ?? 0 }}</span>
        <span class="text-xs text-slate-400">total baru</span>
      </div>
      <div class="stat-card">
        <span class="text-xs text-slate-500">Selesai Hari Ini</span>
        <span class="text-2xl font-bold text-green-600">{{ d?.stats?.tickets_closed_today ?? 0 }}</span>
        <span class="text-xs text-slate-400">resolved/closed</span>
      </div>
      <div class="stat-card">
        <span class="text-xs text-slate-500">Ticket Open</span>
        <span class="text-2xl font-bold text-blue-600">{{ d?.stats?.tickets_open ?? 0 }}</span>
        <span class="text-xs text-slate-400">belum selesai</span>
      </div>
      <div class="stat-card">
        <span class="text-xs text-slate-500">Overdue</span>
        <span class="text-2xl font-bold text-red-600">{{ d?.stats?.tickets_overdue ?? 0 }}</span>
        <span class="text-xs text-slate-400">lewat SLA</span>
      </div>
    </div>

    <!-- SLA cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card border-l-4 border-l-primary-400">
        <span class="text-xs text-slate-500">Avg First Response</span>
        <span class="text-xl font-bold text-slate-900">{{ d?.sla?.avg_first_response_hrs ?? '-' }}j</span>
      </div>
      <div class="stat-card border-l-4 border-l-blue-400">
        <span class="text-xs text-slate-500">Avg Resolusi</span>
        <span class="text-xl font-bold text-slate-900">{{ d?.sla?.avg_resolution_hrs ?? '-' }}j</span>
      </div>
      <div class="stat-card border-l-4 border-l-green-400">
        <span class="text-xs text-slate-500">SLA Terpenuhi</span>
        <span class="text-xl font-bold text-green-600">{{ d?.sla?.sla_met_pct ?? 0 }}%</span>
      </div>
      <div class="stat-card" :class="(d?.sla?.sla_breach_pct ?? 0) > 20 ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-amber-400'">
        <span class="text-xs text-slate-500">SLA Breach</span>
        <span class="text-xl font-bold" :class="(d?.sla?.sla_breach_pct ?? 0) > 20 ? 'text-red-600' : 'text-amber-600'">{{ d?.sla?.sla_breach_pct ?? 0 }}%</span>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Trend chart -->
      <div class="card p-5 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900 mb-4">Ticket Masuk vs Selesai (30 hari)</h3>
        <div class="h-48">
          <Line v-if="trendData" :data="trendData" :options="lineOpts" />
        </div>
      </div>
      <!-- By status donut -->
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-4">Per Status</h3>
        <div class="h-48">
          <Doughnut v-if="statusData" :data="statusData" :options="donutOpts" />
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Overdue list -->
      <div class="card p-5 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Ticket Overdue
        </h3>
        <div v-if="!d?.overdue?.length" class="text-sm text-slate-400 py-4 text-center">Tidak ada ticket overdue</div>
        <div v-else class="space-y-2">
          <div v-for="t in d.overdue" :key="t.id" @click="tabs.openTab(t)" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-slate-100">
            <span :class="['priority-dot flex-shrink-0']" :style="{ background: t.priority_color }" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-slate-900 truncate">{{ t.ticket_number }} — {{ t.title }}</p>
              <p class="text-xs text-slate-400">{{ t.assigned_to_name || 'Unassigned' }} · <span class="text-red-500">{{ t.hours_overdue }}j terlambat</span></p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0" :style="{ background: t.priority_color }">{{ t.priority_name }}</span>
          </div>
        </div>
      </div>

      <!-- Workload -->
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-3">Workload Staff</h3>
        <div class="space-y-2">
          <div v-for="s in d?.workload" :key="s.id" class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold flex-shrink-0 overflow-hidden">
              <img v-if="s.avatar" :src="`/uploads/${s.avatar}`" class="w-full h-full object-cover" />
              <span v-else>{{ s.name?.charAt(0) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-slate-700 truncate">{{ s.name }}</span>
                <span class="text-xs text-slate-500">{{ s.open_tickets }}</span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :style="{ width: Math.min(100, (s.open_tickets / Math.max(...(d?.workload?.map((x:any) => x.open_tickets) || [1]))) * 100) + '%', background: s.overdue_tickets > 0 ? '#ef4444' : '#6366f1' }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity feed -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-900 mb-3">Aktivitas Terbaru</h3>
      <div class="space-y-3">
        <div v-for="a in d?.activity" :key="a.ticket_id + a.created_at" class="flex items-start gap-3">
          <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold flex-shrink-0 overflow-hidden">
            <img v-if="a.user_avatar" :src="`/uploads/${a.user_avatar}`" class="w-full h-full object-cover" />
            <span v-else>{{ a.user_name?.charAt(0) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-slate-700"><span class="font-medium">{{ a.user_name }}</span> {{ a.type === 'ticket' ? 'membuat ticket' : 'membalas' }} <span class="text-primary-600 cursor-pointer hover:underline" @click="tabs.openTab({ id: a.ticket_id, ticket_number: a.ticket_number, title: a.message })">{{ a.ticket_number }}</span></p>
            <p class="text-xs text-slate-400">{{ timeAgo(a.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Line, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const auth = useAuthStore()
const tabs = useTabStore()
definePageMeta({ middleware: 'auth' })

const { data: res } = await useFetch('/api/dashboard')
const d = computed(() => (res.value as any)?.data)

const trendData = computed(() => {
  const trend = d.value?.trend || []
  return {
    labels: trend.map((t: any) => t.date?.slice(5)),
    datasets: [
      { label: 'Masuk', data: trend.map((t: any) => t.created), borderColor: '#6366f1', backgroundColor: '#6366f120', fill: true, tension: 0.4 },
      { label: 'Selesai', data: trend.map((t: any) => t.closed), borderColor: '#22c55e', backgroundColor: '#22c55e20', fill: true, tension: 0.4 }
    ]
  }
})

const statusData = computed(() => {
  const s = d.value?.byStatus || []
  return { labels: s.map((x: any) => x.name), datasets: [{ data: s.map((x: any) => x.count), backgroundColor: s.map((x: any) => x.color), borderWidth: 0 }] }
})

const lineOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 } } } } }

const { timeAgo } = useTimeAgo()
const { startTour, isCompleted } = useTour()

onMounted(() => {
  if (!isCompleted()) {
    setTimeout(() => startTour(), 800)
  }
})
</script>

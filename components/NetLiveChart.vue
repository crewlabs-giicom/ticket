<template>
  <div :style="{ height: height + 'px' }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export interface LiveSeries { label: string; color: string; data: Array<number | null>; fill?: boolean; dashed?: boolean }

// Nilai data dalam bit per detik; sumbu Y ditampilkan otomatis (Kbps/Mbps/Gbps).
const props = withDefaults(defineProps<{
  labels: string[]
  series: LiveSeries[]
  height?: number
  compact?: boolean // sparkline: tanpa sumbu/legend
}>(), { height: 220, compact: false })

function fmtBps(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Gbps`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mbps`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} Kbps`
  return `${Math.round(v)} bps`
}

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map(s => ({
    label: s.label,
    // salinan polos: Chart.js memodifikasi array data, dan pada proxy reactive Vue itu memicu rekursi tak berujung
    data: [...s.data],
    borderColor: s.color,
    backgroundColor: s.color + '26',
    borderWidth: props.compact ? 1.5 : 2,
    borderDash: s.dashed ? [5, 4] : [],
    fill: s.fill ?? false,
    tension: 0.3,
    pointRadius: 0,
    spanGaps: true,
  })),
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const, // update tiap 5 dtk, tanpa animasi supaya ringan
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: !props.compact, position: 'bottom' as const, labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
    tooltip: {
      enabled: !props.compact,
      callbacks: { label: (c: any) => `${c.dataset.label}: ${fmtBps(c.parsed.y ?? 0)}` },
    },
  },
  scales: {
    x: { display: !props.compact, ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false } },
    y: {
      display: !props.compact, beginAtZero: true,
      ticks: { maxTicksLimit: 5, font: { size: 10 }, callback: (v: any) => fmtBps(Number(v)) },
    },
  },
}))
</script>

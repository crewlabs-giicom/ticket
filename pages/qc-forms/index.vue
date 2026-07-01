<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Form QC</h1>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <input v-model="search" @input="load" placeholder="Cari task / project..."
        class="input w-64 text-sm" />
      <AppSelect v-model="filterStatus"
        :options="[
          { value: '', label: 'Semua Status' },
          { value: 'active', label: 'Active' },
          { value: 'approved', label: 'Approved' },
          { value: 'looped', label: 'Looped' },
        ]"
        placeholder="Semua Status"
        class="w-44"
        @update:modelValue="load" />
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-center py-12 text-slate-400">Memuat...</div>
    <div v-else-if="!forms.length" class="text-center py-12 text-slate-400">Tidak ada form QC.</div>
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Form</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Task</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Project</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Template</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Checker</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
            <th class="text-left px-4 py-3 text-slate-500 font-medium">Tanggal</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="f in forms" :key="f.id" class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 text-slate-500 text-xs">#QC-{{ f.id }} <span v-if="f.sequence > 1" class="text-orange-500">(Loop {{ f.sequence }})</span></td>
            <td class="px-4 py-3 font-medium text-slate-800">{{ f.task_title }}</td>
            <td class="px-4 py-3 text-slate-500">{{ f.project_name || '-' }}</td>
            <td class="px-4 py-3 text-slate-500">{{ f.template_name || '-' }}</td>
            <td class="px-4 py-3">
              <span class="text-slate-600">{{ f.done_count }}/{{ f.checker_count }}</span>
              <span class="text-slate-400 text-xs ml-1">checker</span>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(f.status)"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize">
                {{ f.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-400 text-xs">{{ formatDate(f.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/qc-forms/${f.id}`"
                class="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium">
                Buka
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const search = ref('')
const filterStatus = ref('')
const forms = ref<any[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await $fetch<any>('/api/qc-forms', { params })
    forms.value = res?.data || []
  } finally {
    loading.value = false
  }
}

function statusClass(s: string) {
  if (s === 'active') return 'bg-blue-100 text-blue-700'
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (s === 'looped') return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

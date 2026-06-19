<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Workload View</h1>
      <p class="text-sm text-gray-500 mt-1">Beban kerja per anggota tim — hanya terlihat oleh admin</p>
    </div>

    <div v-if="pending" class="flex items-center justify-center h-48 text-gray-400">Memuat…</div>

    <div v-else-if="data" class="space-y-3">
      <div
        v-for="member in data"
        :key="member.id"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Name & meta -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {{ initials(member.name) }}
              </div>
              <div>
                <p class="font-semibold text-gray-800 text-sm">{{ member.name }}</p>
                <p class="text-xs text-gray-400">{{ member.email }}</p>
              </div>
              <span v-if="member.ticket_overdue > 0" class="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {{ member.ticket_overdue }} overdue
              </span>
            </div>

            <!-- Task breakdown bar -->
            <div class="mt-3">
              <p class="text-xs text-gray-500 mb-1">Tasks aktif: {{ member.task_total - member.task_done }}</p>
              <div class="flex h-2 rounded-full overflow-hidden gap-px w-full max-w-sm">
                <div v-if="member.task_in_progress" :style="{ width: pct(member.task_in_progress, member.task_total) }" class="bg-blue-500"></div>
                <div v-if="member.task_review" :style="{ width: pct(member.task_review, member.task_total) }" class="bg-amber-400"></div>
                <div v-if="member.task_todo" :style="{ width: pct(member.task_todo, member.task_total) }" class="bg-indigo-300"></div>
                <div v-if="member.task_backlog" :style="{ width: pct(member.task_backlog, member.task_total) }" class="bg-gray-200"></div>
              </div>
              <div class="flex gap-3 mt-1 text-[11px] text-gray-500">
                <span v-if="member.task_in_progress" class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>In Progress {{ member.task_in_progress }}</span>
                <span v-if="member.task_review" class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Review {{ member.task_review }}</span>
                <span v-if="member.task_todo" class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-300 inline-block"></span>Todo {{ member.task_todo }}</span>
                <span v-if="member.task_backlog" class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-gray-200 inline-block"></span>Backlog {{ member.task_backlog }}</span>
              </div>
            </div>
          </div>

          <!-- Ticket stats -->
          <div class="flex-shrink-0 text-right text-sm">
            <p class="text-gray-500 text-xs">Ticket aktif</p>
            <p class="text-xl font-bold text-gray-800">{{ member.ticket_active }}</p>
            <div class="flex gap-2 justify-end mt-2">
              <NuxtLink :to="`/tasks?assigned_to=${member.id}`" class="text-xs text-indigo-600 hover:underline">Tasks ↗</NuxtLink>
              <NuxtLink :to="`/tickets?assigned_to=${member.id}`" class="text-xs text-indigo-600 hover:underline">Tickets ↗</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()

// Redirect non-admin
onMounted(() => {
  if (!auth.isAdmin) navigateTo('/')
})

const { data, pending } = await useFetch<any[]>('/api/workload')

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function pct(val: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((val / total) * 100)}%`
}
</script>

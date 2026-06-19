<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Projects</h1>
        <p class="text-sm text-slate-500 mt-0.5">{{ projects.length }} project aktif</p>
      </div>
    </div>

    <!-- Card grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <NuxtLink
        v-for="p in projects"
        :key="p.id"
        :to="`/projects/${p.id}`"
        class="card p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 group cursor-pointer"
      >
        <!-- Top: icon + name + status badge -->
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-2 flex-wrap">
              <h3 class="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">{{ p.name }}</h3>
              <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', statusStyle(p.status).class]">
                {{ statusStyle(p.status).label }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{{ p.description || 'Tidak ada deskripsi' }}</p>
          </div>
        </div>

        <!-- Task summary -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-base leading-none">✅</span>
            <span class="font-semibold text-slate-700">{{ p.task_done ?? 0 }}</span>
            <span class="text-slate-400">done</span>
          </div>
          <div class="w-px h-3 bg-slate-200"></div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-base leading-none">⏳</span>
            <span class="font-semibold text-slate-700">{{ p.task_waiting ?? 0 }}</span>
            <span class="text-slate-400">in progress</span>
          </div>
          <div class="w-px h-3 bg-slate-200"></div>
          <div class="flex items-center gap-1.5 text-xs" :class="(p.task_overdue ?? 0) > 0 ? 'text-red-500' : 'text-slate-400'">
            <span class="text-base leading-none">🔴</span>
            <span class="font-semibold">{{ p.task_overdue ?? 0 }}</span>
            <span>overdue</span>
          </div>
        </div>

        <!-- Footer: members + ticket count -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <!-- Member avatar stack -->
          <div class="flex items-center">
            <template v-if="memberList(p).length">
              <div
                v-for="(m, idx) in memberList(p).slice(0, 4)"
                :key="idx"
                class="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0"
                :style="{ marginLeft: idx === 0 ? '0' : '-8px', zIndex: 4 - idx }"
                :title="m"
              >{{ initials(m) }}</div>
              <span
                v-if="p.member_count > 4"
                class="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-slate-500 flex-shrink-0"
                style="margin-left: -8px"
              >+{{ p.member_count - 4 }}</span>
            </template>
            <span v-else class="text-xs text-slate-400">Belum ada member</span>
          </div>

          <!-- Ticket count -->
          <div class="flex items-center gap-1 text-xs text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
            {{ p.ticket_count }} tiket
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="!projects.length" class="text-center py-16 text-slate-400 text-sm">Belum ada project.</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data } = await useFetch('/api/projects')
const projects = computed(() => ((data.value as any)?.data || []).filter((p: any) => p.is_active))

function memberList(p: any): string[] {
  if (!p.member_names) return []
  return p.member_names.split('||').filter(Boolean)
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

type ProjectStatus = 'active' | 'on_hold' | 'completed'

const STATUS_STYLES: Record<ProjectStatus, { label: string; class: string }> = {
  active:    { label: 'Active',     class: 'bg-emerald-100 text-emerald-700' },
  on_hold:   { label: 'On Hold',   class: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', class: 'bg-slate-100 text-slate-500' },
}

function statusStyle(status: string) {
  return STATUS_STYLES[status as ProjectStatus] ?? STATUS_STYLES.active
}
</script>

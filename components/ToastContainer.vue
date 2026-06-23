<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in notif.toasts"
          :key="t._id"
          class="pointer-events-auto w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 animate-slide-in"
          :class="(t.ticket_id || t.task_id) ? 'cursor-pointer' : ''"
          @click="t.ticket_id ? goToTicket(t) : t.task_id ? goToTask(t) : null"
        >
          <div class="flex items-start gap-3">
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeClass(t.type)]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ t.title }}</p>
              <p class="text-xs text-slate-500 mt-0.5 truncate">{{ t.message }}</p>
            </div>
            <button
              class="ml-1 flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full text-base leading-none"
              @click.stop="notif.dismissToast(t._id)"
              aria-label="Tutup"
            >×</button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const notif = useNotifStore()
const router = useRouter()

function typeClass(type: string) {
  const map: Record<string, string> = {
    ticket_assigned: 'bg-primary-100 text-primary-600',
    ticket_created: 'bg-blue-100 text-blue-600',
    ticket_invite: 'bg-primary-100 text-primary-600',
    new_response: 'bg-green-100 text-green-600',
    task_assigned: 'bg-primary-100 text-primary-600',
    task_created: 'bg-blue-100 text-blue-600',
    task_updated: 'bg-amber-100 text-amber-600',
    task_comment: 'bg-green-100 text-green-600',
    task_invite: 'bg-primary-100 text-primary-600',
  }
  return map[type] || 'bg-slate-100 text-slate-600'
}

function goToTicket(t: any) {
  router.push(`/tickets/${t.ticket_id}`)
  notif.dismissToast(t._id)
}

function goToTask(t: any) {
  router.push('/tasks')
  notif.dismissToast(t._id)
}
</script>

<style scoped>
.toast-enter-active { animation: slideIn 0.2s ease-out; }
.toast-leave-active { animation: slideIn 0.15s ease-in reverse; }
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>

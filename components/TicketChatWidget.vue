<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">

      <!-- Expanded window (only one at a time) -->
      <Transition name="chat-window">
        <div
          v-if="expandedTicket"
          class="pointer-events-auto w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style="height: 420px;"
        >
          <!-- Header -->
          <div class="bg-indigo-600 px-3 py-2 flex items-center gap-2 shrink-0">
            <div class="flex-1 min-w-0">
              <div class="text-white text-xs font-medium truncate">{{ expandedTicket.title }}</div>
              <div class="text-indigo-200 text-[11px]">{{ expandedTicket.ticketNumber }}</div>
            </div>
            <button @click="chatWidget.toggleExpand(expandedTicket.ticketId)" class="text-indigo-200 hover:text-white p-1 rounded transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"/>
              </svg>
            </button>
            <button @click="chatWidget.closeTicket(expandedTicket.ticketId)" class="text-indigo-200 hover:text-white p-1 rounded transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>

          <!-- Thread -->
          <TicketChatThread
            :ticketId="expandedTicket.ticketId"
            :projectId="expandedTicket.projectId"
            :projectName="expandedTicket.projectName"
            :ref="el => { threadRef = el }"
            class="flex-1 min-h-0"
          />
        </div>
      </Transition>

      <!-- Chat heads row -->
      <div class="flex flex-row-reverse gap-2 pointer-events-auto flex-wrap justify-end">
        <div
          v-for="ticket in chatWidget.openTickets"
          :key="ticket.ticketId"
          class="relative"
        >
          <button
            @click="chatWidget.toggleExpand(ticket.ticketId)"
            class="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            :title="`${ticket.ticketNumber} — ${ticket.title}`"
          >
            <span class="text-[10px] font-bold leading-none">{{ ticket.ticketNumber.replace(/^[A-Z]+-/, '') }}</span>
          </button>
          <!-- Unread badge -->
          <span
            v-if="unread(ticket.ticketId)"
            class="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 pointer-events-none"
          >
            {{ unread(ticket.ticketId) > 9 ? '9+' : unread(ticket.ticketId) }}
          </span>
          <!-- Close button on hover -->
          <button
            @click.stop="chatWidget.closeTicket(ticket.ticketId)"
            class="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gray-500 text-white text-[10px] hidden group-hover:flex items-center justify-center hover:bg-red-500 transition"
            title="Tutup"
          >×</button>
        </div>
      </div>

    </div>
  </Teleport>
</template>

<script setup lang="ts">
const chatWidget = useChatWidgetStore()
const threadRef = ref<any>(null)

const expandedTicket = computed(() =>
  chatWidget.openTickets.find(t => t.mode === 'expanded') || null
)

function initials(title: string) {
  return title?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function unread(ticketId: number) {
  return chatWidget.unreadCounts[ticketId] || 0
}
</script>

<style scoped>
.chat-window-enter-active,
.chat-window-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>

<template>
  <div v-if="ticket" class="max-w-4xl mx-auto space-y-4">
    <!-- Header -->
    <div class="card p-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{{ ticket.ticket_number }}</span>
            <span class="badge text-white text-xs" :style="{ background: ticket.status_color }">{{ ticket.status_name }}</span>
            <div class="flex items-center gap-1"><span class="priority-dot" :style="{ background: ticket.priority_color }" /><span class="text-xs text-slate-600">{{ ticket.priority_name }}</span></div>
            <span v-if="ticket.sla_breached" class="badge bg-red-100 text-red-700">SLA Breach</span>
          </div>
          <h2 class="text-lg font-semibold text-slate-900">{{ ticket.title }}</h2>
          <p class="text-sm text-slate-500 mt-1">{{ ticket.project_name }} · Dibuat oleh {{ ticket.created_by_name }} · {{ timeAgo(ticket.created_at) }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <template v-if="auth.isStaffOrAdmin">
            <AppSelect
              v-model="editStatus"
              :options="statuses.map((s: any) => ({ value: s.id, label: s.name }))"
              placeholder="Status"
              class="w-36"
              @update:modelValue="updateField('status_id', $event)"
            />
            <AppSelect
              v-model="editPriority"
              :options="priorities.map((p: any) => ({ value: p.id, label: p.name }))"
              placeholder="Priority"
              class="w-32"
              @update:modelValue="updateField('priority_id', $event)"
            />
            <AppSelect
              v-model="editAssigned"
              :options="[{ value: '', label: 'Unassigned' }, ...staff.map((u: any) => ({ value: u.id, label: u.name }))]"
              placeholder="Unassigned"
              class="w-36"
              @update:modelValue="updateField('assigned_to', $event)"
            />
            <button @click="tabs.togglePin(ticket.id)" class="btn-ghost text-xs py-1.5">
              {{ tabs.tabs.find(t=>t.id===ticket.id)?.pinned ? 'Unpin Tab' : 'Pin Tab' }}
            </button>
          </template>
          <button @click="openChat" class="btn-ghost text-xs py-1.5 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
              <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.25v.05a43.143 43.143 0 00-1.085.628 1.5 1.5 0 00-.372 2.273c.307.38.712.646 1.171.76a4.38 4.38 0 01-.103.065 1.5 1.5 0 01-1.5-2.598l.032-.018a43.167 43.167 0 00-.966-.553 1.5 1.5 0 01-.62-2.039A14.31 14.31 0 013.505 2.365z"/>
              <path d="M7.5 9.25c0-2.075 1.56-3.818 3.6-4.052a41.647 41.647 0 014.8 0C17.94 5.432 19.5 7.175 19.5 9.25v1.5c0 2.075-1.56 3.818-3.6 4.052a41.647 41.647 0 01-4.8 0C9.06 14.568 7.5 12.825 7.5 11.75v-2.5z"/>
            </svg>
            Chat
          </button>
        </div>
      </div>

      <div class="mt-4 prose prose-sm max-w-none">
        <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ ticket.description }}</p>
      </div>

      <div class="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
        <div><span class="font-medium">Assigned:</span> {{ ticket.assigned_to_name || 'Belum di-assign' }}</div>
        <div><span class="font-medium">Due:</span> <span :class="ticket.sla_breached ? 'text-red-600 font-medium' : ''">{{ fmtDateTime(ticket.due_date) }}</span></div>
        <div><span class="font-medium">Dibuat:</span> {{ fmtDateTime(ticket.created_at) }}</div>
        <div v-if="ticket.resolved_at"><span class="font-medium">Resolved:</span> {{ fmtDateTime(ticket.resolved_at) }}</div>
      </div>

      <!-- Task & duration links -->
      <div class="mt-4 flex flex-wrap gap-3 text-xs border-t border-slate-100 pt-4">
        <NuxtLink v-if="ticket.task_id" :to="`/tasks`" class="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Task: {{ ticket.task_title || ticket.task_id }}
        </NuxtLink>
        <span v-if="ticket.resolved_at || ticket.closed_at" class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Durasi: {{ formatDuration(ticket.created_at, ticket.resolved_at || ticket.closed_at) }}
        </span>
      </div>

      <!-- Ticket-level Attachments -->
      <div v-if="ticket.attachments?.length" class="mt-4 border-t border-slate-100 pt-4">
        <p class="text-xs font-semibold text-slate-600 mb-2">Lampiran ({{ ticket.attachments.length }})</p>
        <div class="flex flex-wrap gap-2">
          <template v-for="(a, i) in ticket.attachments" :key="a.id">
            <button v-if="isImage(a.mime_type)" @click="openLightbox(ticketImages, ticketImageIndex(i))" class="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors shrink-0">
              <img :src="`/uploads/${a.filename}`" :alt="a.original_name" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg class="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
              </div>
            </button>
            <a v-else :href="`/uploads/${a.filename}`" :download="a.original_name" target="_blank" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-700">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              {{ a.original_name }}
            </a>
          </template>
        </div>
      </div>
    </div>

    <!-- Chat Responses -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-slate-900">Diskusi ({{ ticket.responses?.filter((r:any) => !r.is_internal || auth.isStaffOrAdmin).length || 0 }})</h3>
        <button
          v-if="ticket.status_is_resolved && transcriptData"
          @click="showTranscriptModal = true"
          class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clip-rule="evenodd"/>
            <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"/>
          </svg>
          Transcript Chat ({{ transcriptData.message_count }} pesan)
        </button>
      </div>

      <div class="space-y-3">
        <div v-for="r in ticket.responses" :key="r.id" :class="['flex gap-2', r.user_id === auth.user?.id ? 'flex-row-reverse' : 'flex-row']">
          <!-- Avatar -->
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-1 overflow-hidden"
            :class="r.user_id === auth.user?.id ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'">
            <img v-if="r.user_avatar" :src="`/uploads/${r.user_avatar}`" class="w-full h-full object-cover" />
            <span v-else>{{ r.user_name?.charAt(0) }}</span>
          </div>

          <!-- Bubble -->
          <div :class="['max-w-[72%]', r.user_id === auth.user?.id ? 'items-end' : 'items-start', 'flex flex-col gap-1']">
            <!-- Name + timestamp -->
            <div :class="['flex items-center gap-1.5 text-[11px]', r.user_id === auth.user?.id ? 'flex-row-reverse' : 'flex-row']">
              <span class="font-semibold text-slate-700">{{ r.user_name }}</span>
              <span v-if="r.is_internal" class="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Internal</span>
              <span class="text-slate-400">{{ timeAgo(r.created_at) }}</span>
            </div>

            <!-- Message bubble -->
            <div :class="[
              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
              r.user_id === auth.user?.id
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : r.is_internal
                  ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm'
            ]">
              <p class="whitespace-pre-wrap">{{ r.message }}</p>

              <!-- Response attachments -->
              <div v-if="r.attachments?.length" :class="['mt-2 flex flex-wrap gap-1.5', r.user_id === auth.user?.id ? 'justify-end' : '']">
                <template v-for="a in r.attachments" :key="a.id">
                  <button v-if="isImage(a.mime_type)" @click="openLightbox(allResponseImages, allResponseImageIndex(a.id))" class="group relative w-14 h-14 rounded-lg overflow-hidden border border-white/30 hover:border-white/60 transition-colors shrink-0">
                    <img :src="`/uploads/${a.filename}`" :alt="a.original_name" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                  <a v-else :href="`/uploads/${a.filename}`" :download="a.original_name" target="_blank"
                    :class="['flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors',
                      r.user_id === auth.user?.id
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700']">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <span class="max-w-[120px] truncate">{{ a.original_name }}</span>
                  </a>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reply form -->
      <div class="mt-5 border-t border-slate-200 pt-5">
        <div v-if="auth.isStaffOrAdmin" class="flex items-center gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="isInternal" class="w-3.5 h-3.5 rounded" />
            <span class="text-xs text-slate-600">Internal Note (hanya staff)</span>
          </label>
        </div>
        <textarea v-model="reply" :class="['input min-h-[80px] resize-none', isInternal && 'border-amber-300 bg-amber-50/50']" :placeholder="isInternal ? 'Tulis catatan internal... (Ctrl+V untuk paste gambar)' : 'Tulis balasan... (Ctrl+V untuk paste gambar)'" @paste="handleReplyPaste" />

        <!-- Reply attachments preview -->
        <div v-if="replyFiles.length" class="flex flex-wrap gap-2 mt-2">
          <div v-for="(f, i) in replyFiles" :key="i">
            <template v-if="f.mime_type?.startsWith('image/')">
              <div class="flex flex-col items-center gap-0.5">
                <img :src="`/uploads/${f.filename}`" class="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" @click="openReplyImageLightbox(i)" />
                <button type="button" @click="replyFiles.splice(i, 1)" class="text-[10px] text-slate-400 hover:text-red-500 leading-none">✕</button>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span class="max-w-[120px] truncate">{{ f.original_name }}</span>
                <button type="button" @click="replyFiles.splice(i, 1)" class="text-slate-400 hover:text-red-500 ml-0.5">✕</button>
              </div>
            </template>
          </div>
        </div>
        <p v-if="uploadError" class="text-xs text-red-600 mt-1">{{ uploadError }}</p>

        <div class="flex items-center justify-between mt-2">
          <!-- Attach button -->
          <label class="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 hover:text-primary-600 transition-colors" :class="uploading && 'opacity-50 pointer-events-none'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            {{ uploading ? 'Mengupload...' : 'Lampirkan file' }}
            <input ref="fileInput" type="file" multiple class="hidden" :disabled="uploading" @change="handleReplyFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
          </label>
          <button @click="submitReply" :disabled="!reply.trim() || sending || uploading" class="btn-primary">{{ sending ? 'Mengirim...' : 'Kirim' }}</button>
        </div>
      </div>
    </div>
    <!-- Ticket references -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-900">Referensi Ticket</h3>
        <button @click="showLinkModal = true" class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Link referensi
        </button>
      </div>

      <div v-if="ticket.links?.length || ticket.backLinks?.length" class="space-y-2">
        <div v-for="lnk in ticket.links" :key="lnk.id" class="flex items-center gap-2 text-sm">
          <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{{ lnk.relation_type }}</span>
          <NuxtLink :to="`/tickets/${lnk.referenced_ticket_id}`" class="text-indigo-600 hover:underline font-mono text-xs">{{ lnk.ref_ticket_number }}</NuxtLink>
          <span class="text-slate-500 text-xs truncate">{{ lnk.ref_ticket_title }}</span>
        </div>
        <div v-for="bl in ticket.backLinks" :key="bl.id" class="flex items-center gap-2 text-sm">
          <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">direferensi oleh</span>
          <NuxtLink :to="`/tickets/${bl.ticket_id}`" class="text-indigo-600 hover:underline font-mono text-xs">{{ bl.new_ticket_number }}</NuxtLink>
          <span class="text-slate-500 text-xs truncate">{{ bl.new_ticket_title }}</span>
        </div>
      </div>
      <p v-else class="text-xs text-slate-400">Belum ada referensi ticket terkait.</p>
    </div>

    <!-- Activity History -->
    <div v-if="ticket.history?.length" class="card p-5">
      <h3 class="text-sm font-semibold text-slate-900 mb-3">Activity</h3>
      <div class="space-y-3">
        <div v-for="h in ticket.history" :key="h.id" class="flex gap-3 items-start">
          <div class="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0 ring-4 ring-white"></div>
          <div class="flex-1 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
            <p class="text-xs text-slate-700">{{ h.label }}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">{{ timeAgo(h.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Link modal -->
    <div v-if="showLinkModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showLinkModal = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="font-semibold mb-4">Link Ticket Referensi</h3>
        <div class="space-y-3">
          <input v-model="linkSearch" @input="searchTickets" type="text" placeholder="Cari ticket by judul / nomor…" class="input text-sm w-full" />
          <div v-if="linkResults.length" class="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
            <button v-for="t in linkResults" :key="t.id" @click="selectLinkTicket(t)" class="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm">
              <span class="font-mono text-xs text-slate-400">{{ t.ticket_number }}</span>
              <span class="flex-1 truncate">{{ t.title }}</span>
            </button>
          </div>
          <div v-if="selectedLinkTicket" class="bg-indigo-50 rounded-lg p-3 text-sm">
            <p>Link ke: <strong>{{ selectedLinkTicket.ticket_number }}</strong> — {{ selectedLinkTicket.title }}</p>
            <AppSelect
              v-model="linkType"
              :options="[{ value: 'recurring', label: 'recurring' }, { value: 'duplicate', label: 'duplicate' }]"
              placeholder="Tipe"
              class="mt-2 w-40"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="showLinkModal = false" class="text-sm text-slate-600">Batal</button>
          <button @click="submitLink" :disabled="!selectedLinkTicket || linkSaving" class="btn-primary text-sm">
            {{ linkSaving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Transcript Chat Modal -->
    <div v-if="showTranscriptModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showTranscriptModal = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col" style="max-height: 80vh;">
        <!-- Modal header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="font-semibold text-slate-900 text-sm">Transcript Chat</h3>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ transcriptData?.message_count }} pesan · Ticket ditutup {{ fmtDateTime(transcriptData?.created_at) }}
            </p>
          </div>
          <button @click="showTranscriptModal = false" class="text-slate-400 hover:text-slate-600 p-1 rounded transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          <div v-if="!transcriptData?.transcript?.length" class="text-center text-sm text-slate-400 py-8">Tidak ada riwayat chat.</div>
          <div
            v-for="(msg, i) in transcriptData?.transcript"
            :key="i"
            class="flex gap-2 flex-row"
          >
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 bg-slate-200 text-slate-600">
              {{ msg.sender_name?.split(' ').slice(0,2).map((w:string) => w[0]).join('').toUpperCase() || '?' }}
            </div>
            <div class="flex flex-col max-w-[75%] items-start">
              <div class="flex items-center gap-1.5 mb-0.5">
                <span class="text-[11px] font-semibold text-slate-700">{{ msg.sender_name }}</span>
                <span v-if="msg.role !== 'customer'" class="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 rounded">{{ msg.role }}</span>
              </div>
              <div class="rounded-2xl rounded-tl-sm px-3 py-2 text-sm break-words bg-slate-100 text-slate-800">
                {{ msg.message }}
              </div>
              <span class="text-[10px] text-slate-400 mt-0.5">{{ fmtDateTime(msg.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-48 text-slate-400">Ticket tidak ditemukan</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { fmtDateTime } = useDate()
const auth = useAuthStore()
const tabs = useTabStore()
const chatWidget = useChatWidgetStore()
const lb = useLightbox()

function isImage(mime?: string) { return !!mime?.startsWith('image/') }

const ticketImages = computed(() =>
  (ticket.value?.attachments || []).filter((a: any) => isImage(a.mime_type))
    .map((a: any) => ({ url: `/uploads/${a.filename}`, name: a.original_name }))
)
function ticketImageIndex(rawIdx: number) {
  const imgs = (ticket.value?.attachments || []).filter((a: any) => isImage(a.mime_type))
  return imgs.findIndex((_: any, i: number) => i === rawIdx)
}

const allResponseImages = computed(() => {
  const imgs: Array<{ url: string; name: string; id: number }> = []
  for (const r of (ticket.value?.responses || [])) {
    for (const a of (r.attachments || [])) {
      if (isImage(a.mime_type)) imgs.push({ url: `/uploads/${a.filename}`, name: a.original_name, id: a.id })
    }
  }
  return imgs
})
function allResponseImageIndex(attachmentId: number) {
  return allResponseImages.value.findIndex(i => i.id === attachmentId)
}

function openLightbox(images: any[], index: number) {
  if (index < 0) return
  lb.open(images.map((i: any) => ({ url: i.url, name: i.name })), index)
}

function openChat() {
  if (!ticket.value) return
  chatWidget.openTicket({ ticketId: ticket.value.id, ticketNumber: ticket.value.ticket_number, title: ticket.value.title, projectId: ticket.value.project_id, projectName: ticket.value.project_name })
}
const route = useRoute()
const id = route.params.id

const { data: res, refresh } = await useFetch(`/api/tickets/${id}`)
const ticket = computed(() => (res.value as any)?.data)

const { data: sd } = await useFetch('/api/statuses')
const { data: pd } = await useFetch('/api/priorities')
const { data: ud } = await useFetch('/api/users', {
  query: { project_id: ticket.value?.project_id, limit: 500 }
})
const statuses = computed(() => (sd.value as any)?.data || [])
const priorities = computed(() => (pd.value as any)?.data || [])
const staff = computed(() => ((ud.value as any)?.data || []).filter((u: any) => u.is_active && u.role !== 'customer'))

const editStatus = ref(ticket.value?.status_id)
const editPriority = ref(ticket.value?.priority_id)
const editAssigned = ref(ticket.value?.assigned_to || '')

watch(ticket, (t) => {
  if (t) {
    editStatus.value = t.status_id
    editPriority.value = t.priority_id
    editAssigned.value = t.assigned_to || ''
  }
})

const showTranscriptModal = ref(false)
const transcriptData = ref<any>(null)

watchEffect(async () => {
  if (ticket.value?.status_is_resolved) {
    const res = await $fetch(`/api/tickets/${id}/transcript`) as any
    transcriptData.value = res.data
  }
})

const reply = ref('')
const isInternal = ref(false)
const sending = ref(false)
const uploading = ref(false)
const uploadError = ref('')
const replyFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])
const fileInput = ref<HTMLInputElement>()

function openReplyImageLightbox(fileIndex: number) {
  const images = replyFiles.value
    .filter(f => f.mime_type?.startsWith('image/'))
    .map(f => ({ url: `/uploads/${f.filename}`, name: f.original_name }))
  let imgIdx = 0
  let count = 0
  for (let i = 0; i <= fileIndex; i++) {
    if (replyFiles.value[i]?.mime_type?.startsWith('image/')) {
      imgIdx = count
      count++
    }
  }
  lb.open(images, imgIdx)
}

async function handleReplyPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
  if (!items.length) return
  e.preventDefault()
  uploading.value = true
  uploadError.value = ''
  try {
    for (const item of items) {
      const file = item.getAsFile()
      if (file) {
        const ext = item.type.split('/')[1] || 'png'
        const fd = new FormData()
        fd.append('file', file, `paste-${Date.now()}.${ext}`)
        appendTicketUploadContext(fd)
        const r = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
        replyFiles.value.push(r.data)
      }
    }
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || 'Gagal mengupload gambar'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  tabs.clearUnread(Number(id))
  if (ticket.value) tabs.openTab({ id: ticket.value.id, ticket_number: ticket.value.ticket_number, title: ticket.value.title })
})

async function updateField(field: string, value: any) {
  await $fetch(`/api/tickets/${id}`, { method: 'PUT', body: { [field]: value } })
  await refresh()
}

async function handleReplyFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  uploading.value = true
  uploadError.value = ''
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      appendTicketUploadContext(fd)
      const r = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      replyFiles.value.push(r.data)
    }
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Gagal mengupload file'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function appendTicketUploadContext(fd: FormData) {
  const t = ticket.value
  fd.append('menu', 'ticket')
  if (t?.project_id) {
    fd.append('project_id', String(t.project_id))
    fd.append('project_name', t.project_name || '')
  }
}

async function submitReply() {
  if (!reply.value.trim()) return
  sending.value = true
  try {
    await $fetch(`/api/tickets/${id}/responses`, {
      method: 'POST',
      body: { message: reply.value, is_internal: isInternal.value, attachments: replyFiles.value },
    })
    reply.value = ''
    isInternal.value = false
    replyFiles.value = []
    await refresh()
  } finally { sending.value = false }
}

const { timeAgo } = useTimeAgo()

function formatDuration(from: string, to: string) {
  const secs = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  if (secs < 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}h ${h % 24}j`
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

// Ticket links
const showLinkModal = ref(false)
const linkSearch = ref('')
const linkResults = ref<any[]>([])
const selectedLinkTicket = ref<any>(null)
const linkType = ref<'recurring' | 'duplicate'>('recurring')
const linkSaving = ref(false)

let linkSearchTimer: ReturnType<typeof setTimeout>
function searchTickets() {
  clearTimeout(linkSearchTimer)
  linkSearchTimer = setTimeout(async () => {
    if (!linkSearch.value.trim()) { linkResults.value = []; return }
    const res = await $fetch<any>('/api/tickets', { query: { search: linkSearch.value } })
    linkResults.value = (res.data || []).filter((t: any) => t.id !== Number(id)).slice(0, 10)
  }, 300)
}

function selectLinkTicket(t: any) {
  selectedLinkTicket.value = t
  linkSearch.value = ''
  linkResults.value = []
}

async function submitLink() {
  if (!selectedLinkTicket.value) return
  linkSaving.value = true
  try {
    await $fetch('/api/ticket-links', {
      method: 'POST',
      body: { ticket_id: Number(id), referenced_ticket_id: selectedLinkTicket.value.id, relation_type: linkType.value },
    })
    showLinkModal.value = false
    selectedLinkTicket.value = null
    linkType.value = 'recurring'
    await refresh()
  } finally { linkSaving.value = false }
}
</script>

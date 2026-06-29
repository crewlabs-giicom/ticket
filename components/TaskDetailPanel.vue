<template>
  <div class="fixed inset-0 bg-black/20 z-40" @click.self="$emit('close')">
    <div class="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
        <div class="min-w-0">
          <span class="text-xs text-gray-400">{{ task.project_name }}</span>
          <h2 class="text-lg font-semibold text-gray-900 mt-0.5">{{ task.title }}</h2>
          <span v-if="task.status === 'done'" class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mt-1">
            ✓ Selesai
          </span>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5 flex-1">
        <!-- Status / Due -->
        <div class="flex flex-wrap gap-2 items-center">
          <AppSelect
            :model-value="task.status"
            :options="COLUMNS.map(c => ({ value: c.status, label: c.label }))"
            placeholder="Status"
            class="w-36"
            @update:model-value="updateStatus"
          />
          <button @click="showDueDateInput = !showDueDateInput"
            class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            :class="isOverdue(task.due_date) && task.status !== 'done' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            {{ task.due_date ? fmtDate(task.due_date) : 'Set due date' }}
          </button>
          <div v-if="showDueDateInput" class="flex items-center gap-1">
            <input type="date" :value="dueDateInput" @change="updateDueDate"
              class="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <button v-if="task.due_date" @click="clearDueDate" class="text-xs text-slate-400 hover:text-red-500 px-1.5">✕</button>
          </div>
        </div>

        <!-- Assign -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500 w-20 flex-shrink-0">Assigned to</span>
          <AppSelect
            v-model="editAssigned"
            :options="[{ value: '', label: 'Unassigned' }, ...assignableUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Unassigned"
            class="flex-1"
            @update:modelValue="updateAssigned"
          />
        </div>

        <!-- Participants -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-gray-500 w-20 flex-shrink-0">Peserta</span>
            <button @click="showTaskInviteModal = true" class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Undang
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <div v-for="p in taskParticipants" :key="p.user_id" class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 text-xs text-slate-700">
              <div class="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[9px] font-bold text-indigo-700 overflow-hidden flex-shrink-0">
                <img v-if="p.avatar" :src="`/uploads/${p.avatar}`" class="w-full h-full object-cover" />
                <span v-else>{{ p.name?.charAt(0) }}</span>
              </div>
              <span>{{ p.name }}</span>
              <button @click="removeTaskParticipant(p.user_id)" class="text-slate-300 hover:text-red-500 transition-colors">✕</button>
            </div>
            <span v-if="!taskParticipants.length" class="text-xs text-gray-400">Belum ada peserta.</span>
          </div>
        </div>

        <!-- Invite Task Participant Modal -->
        <div v-if="showTaskInviteModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="closeTaskInviteModal">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 class="font-semibold mb-4">Undang Peserta ke Task</h3>
            <div class="space-y-3">
              <input v-model="taskInviteSearch" @input="searchTaskInviteUsers" type="text" placeholder="Cari customer by nama / email…" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div v-if="taskInviteResults.length" class="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                <button
                  v-for="u in taskInviteResults" :key="u.id"
                  @click="addTaskParticipant(u)"
                  :disabled="isAlreadyTaskParticipant(u.id)"
                  class="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0 overflow-hidden">
                    <img v-if="u.avatar" :src="`/uploads/${u.avatar}`" class="w-full h-full object-cover" />
                    <span v-else>{{ u.name?.charAt(0) }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ u.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ u.email }}</p>
                  </div>
                  <span v-if="isAlreadyTaskParticipant(u.id)" class="text-xs text-green-600">Sudah</span>
                  <span v-else class="text-xs text-indigo-600">+ Undang</span>
                </button>
              </div>
              <p v-else-if="taskInviteSearch.length > 1" class="text-xs text-slate-400 text-center py-2">Tidak ada hasil</p>
            </div>
            <div class="flex justify-end mt-4">
              <button @click="closeTaskInviteModal" class="text-sm text-slate-600 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">Tutup</button>
            </div>
          </div>
        </div>

        <!-- Description -->
        <p v-if="task.description" class="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{{ task.description }}</p>
        <p v-else class="text-sm text-gray-300 italic">Tidak ada deskripsi.</p>

        <!-- Linked Tickets -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-700">Linked Tickets <span class="text-gray-400 font-normal">({{ task.tickets?.length || 0 }})</span></h3>
            <button @click="createTicketFromTask" class="text-xs text-indigo-600 hover:text-indigo-800">+ Buat Tiket</button>
          </div>
          <div v-if="task.tickets?.length" class="space-y-1.5">
            <NuxtLink v-for="tk in task.tickets" :key="tk.id" :to="`/tickets/${tk.id}`"
              class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-sm transition-colors"
              @click="$emit('close')">
              <span class="text-indigo-600 font-mono text-xs flex-shrink-0">{{ tk.ticket_number }}</span>
              <span class="text-gray-700 truncate flex-1">{{ tk.title }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0" :style="{ background: tk.status_color }">{{ tk.status_name }}</span>
            </NuxtLink>
          </div>
          <p v-else class="text-xs text-gray-400">Belum ada tiket terhubung.</p>
        </div>

        <!-- Checklist -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-sm font-semibold text-gray-700">Checklist</h3>
            <span v-if="task.checklist?.length" class="text-xs text-gray-400">
              {{ task.checklist.filter((i: any) => i.is_checked).length }}/{{ task.checklist.length }}
            </span>
          </div>
          <div v-if="task.checklist?.length" class="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div class="bg-indigo-500 h-1.5 rounded-full transition-all"
              :style="{ width: `${Math.round(task.checklist.filter((i: any) => i.is_checked).length / task.checklist.length * 100)}%` }">
            </div>
          </div>
          <div class="space-y-1.5 mb-2">
            <div v-for="item in task.checklist" :key="item.id" class="flex items-center gap-2 group">
              <input type="checkbox" :checked="item.is_checked" @change="toggleChecklist(item)"
                class="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
              <span :class="['text-sm flex-1', item.is_checked ? 'line-through text-gray-400' : 'text-gray-700']">{{ item.title }}</span>
              <button @click="deleteChecklistItem(item.id)"
                class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity text-xs leading-none">×</button>
            </div>
          </div>
          <div class="flex gap-2">
            <input v-model="newChecklistTitle" @keydown.enter.prevent="addChecklistItem" type="text"
              placeholder="Tambah poin..."
              class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button @click="addChecklistItem" :disabled="!newChecklistTitle.trim()"
              class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40">Add</button>
          </div>
        </div>

        <!-- Attachments -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-700">Lampiran ({{ task.attachments?.length || 0 }})</h3>
            <label class="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              :class="taskUploading && 'opacity-50 pointer-events-none'">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Tambah File
              <input type="file" multiple class="hidden" :disabled="taskUploading"
                @change="handleTaskAttachment" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
            </label>
          </div>
          <div v-if="task.attachments?.length" class="flex flex-wrap gap-2 mb-2">
            <div v-for="a in task.attachments" :key="a.id" class="relative group">
              <button v-if="isImage(a.mime_type)" @click="openTaskLightbox(a.id)"
                class="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors shrink-0 block">
                <img :src="`/uploads/${a.filename}`" :alt="a.original_name" class="w-full h-full object-cover" />
              </button>
              <a v-else :href="`/uploads/${a.filename}`" :download="a.original_name" target="_blank"
                class="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-700">
                <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span class="max-w-[120px] truncate">{{ a.original_name }}</span>
              </a>
              <button @click="deleteTaskAttachment(a.id)"
                class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">×</button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 mb-2">Belum ada lampiran.</p>
          <p v-if="taskUploading" class="text-xs text-indigo-500">Mengupload...</p>
        </div>

        <!-- Comments -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Komentar</h3>
          <div v-if="task.comments?.length" class="space-y-3 mb-3">
            <div v-for="c in task.comments" :key="c.id" class="flex gap-2.5">
              <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                <img v-if="c.user_avatar" :src="`/uploads/${c.user_avatar}`" class="w-full h-full object-cover" />
                <span v-else>{{ c.user_name?.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-medium text-gray-800">{{ c.user_name }}</span>
                  <span class="text-[10px] text-gray-400">{{ timeAgo(c.created_at) }}</span>
                </div>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ c.message?.trim() }}</p>
                <div v-if="c.attachments?.length" class="flex flex-wrap gap-1.5 mt-1.5">
                  <template v-for="a in c.attachments" :key="a.id">
                    <button v-if="isImage(a.mime_type)" @click="openCommentLightbox(c, a.id)"
                      class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 shrink-0">
                      <img :src="`/uploads/${a.filename}`" class="w-full h-full object-cover" />
                    </button>
                    <a v-else :href="`/uploads/${a.filename}`" :download="a.original_name" target="_blank"
                      class="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:bg-gray-100">
                      <svg class="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      <span class="max-w-[100px] truncate">{{ a.original_name }}</span>
                    </a>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 mb-3">Belum ada komentar.</p>

          <!-- Pending files -->
          <div v-if="commentPendingFiles.length" class="flex flex-wrap gap-1.5 mb-2">
            <div v-for="(f, i) in commentPendingFiles" :key="i">
              <template v-if="isImage(f.mime_type)">
                <div class="flex flex-col items-center gap-0.5">
                  <img :src="`/uploads/${f.filename}`" class="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                  <button @click="commentPendingFiles.splice(i, 1)" class="text-[10px] text-gray-400 hover:text-red-500 leading-none">✕</button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600">
                  <svg class="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span class="max-w-[80px] truncate">{{ f.original_name }}</span>
                  <button @click="commentPendingFiles.splice(i, 1)" class="text-gray-400 hover:text-red-500 ml-0.5">✕</button>
                </div>
              </template>
            </div>
          </div>

          <!-- Comment input -->
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <textarea v-model="newComment" rows="2"
                placeholder="Tulis komentar... (Ctrl+V untuk paste gambar)"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                @paste="handleCommentPaste" />
              <div class="flex items-center gap-2 mt-1">
                <label class="cursor-pointer text-[11px] text-gray-400 hover:text-indigo-600 flex items-center gap-1"
                  :class="commentUploading && 'opacity-50 pointer-events-none'">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  Lampirkan file
                  <input type="file" multiple class="hidden" :disabled="commentUploading"
                    @change="handleCommentFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
                </label>
                <span v-if="commentUploading" class="text-[11px] text-indigo-500">Mengupload...</span>
              </div>
            </div>
            <button @click="postComment"
              :disabled="(!newComment.trim() && !commentPendingFiles.length) || postingComment || commentUploading"
              class="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 self-end">Post</button>
          </div>
        </div>

        <!-- Time Tracker -->
        <div class="border border-slate-200 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-700">Time Tracker</h3>
              <p class="text-xs text-slate-400 mt-0.5">Total: <span class="font-medium text-slate-600">{{ timer.totalFormatted.value }}</span></p>
            </div>
            <div class="flex items-center gap-1.5">
              <!-- Running: show Pause + Stop -->
              <template v-if="timer.isRunning.value">
                <span class="text-xs text-slate-500 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-sm bg-emerald-500 animate-pulse"></span>
                  {{ timer.elapsedFormatted.value }}
                </span>
                <button @click="timer.pause()"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Jeda
                </button>
                <button @click="timer.stop()"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                  Stop
                </button>
              </template>
              <!-- Paused: show Resume + Stop -->
              <template v-else-if="timer.isPaused.value">
                <button @click="timer.resume()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Lanjutkan
                </button>
                <button @click="timer.stop()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                  Stop
                </button>
              </template>
              <!-- Idle: show Mulai -->
              <template v-else>
                <button @click="timer.start()"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Mulai
                </button>
              </template>
            </div>
          </div>
          <div v-if="timer.timelogs.value.length" class="space-y-1.5 max-h-40 overflow-y-auto">
            <div v-for="log in timer.timelogs.value" :key="log.id" class="flex items-center justify-between text-xs">
              <span class="text-slate-600">{{ log.user_name }}</span>
              <span class="text-slate-400">{{ log.duration_seconds ? timer.formatSeconds(log.duration_seconds) : '...' }}</span>
              <span class="text-slate-300">{{ timeAgo(log.started_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Activity -->
        <div v-if="task.history?.length">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Activity</h3>
          <div class="space-y-2">
            <div v-for="h in task.history" :key="h.id" class="flex gap-2.5 items-start">
              <div class="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
              <div class="flex-1">
                <p class="text-xs text-gray-600">{{ h.label }}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">{{ timeAgo(h.created_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-5 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
        <button @click="deleteTask" class="text-xs text-red-500 hover:text-red-700">Hapus task</button>
        <button @click="$emit('close')" class="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">Tutup</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ task: any }>()
const emit = defineEmits<{
  close: []
  deleted: [id: number]
}>()

// Local reactive copy so we can mutate (add comment, checklist, etc.)
const task = reactive(JSON.parse(JSON.stringify(props.task)))
watch(() => props.task, (val) => Object.assign(task, JSON.parse(JSON.stringify(val))))

const editAssigned = ref(task.assigned_to || '')
const assignableUsers = ref<any[]>([])

// Due date edit
const showDueDateInput = ref(false)
const dueDateInput = computed(() => (task.due_date ? String(task.due_date).slice(0, 10) : ''))
async function updateDueDate(e: Event) {
  const val = (e.target as HTMLInputElement).value
  await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { due_date: val || null } })
  task.due_date = val || null
  showDueDateInput.value = false
}
async function clearDueDate() {
  await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { due_date: null } })
  task.due_date = null
  showDueDateInput.value = false
}

onMounted(async () => {
  const res = await $fetch<any>('/api/users', { query: { project_id: task.project_id, limit: 500 } }).catch(() => null)
  assignableUsers.value = (res?.data || []).filter((u: any) => u.is_active && u.role !== 'customer')
})

async function updateStatus(status: string) {
  task.status = status
  await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { status } })
  const hist = await $fetch<any>(`/api/tasks/${task.id}/history`)
  task.history = hist.data
}

async function updateAssigned(value: any) {
  await $fetch(`/api/tasks/${task.id}`, { method: 'PUT', body: { assigned_to: value || null } })
  const found = assignableUsers.value.find((u: any) => String(u.id) === String(value))
  task.assigned_to = value || null
  task.assigned_to_name = found?.name || null
  task.assigned_to_avatar = found?.avatar || null
  const hist = await $fetch<any>(`/api/tasks/${task.id}/history`)
  task.history = hist.data
}

const COLUMNS = [
  { status: 'backlog',     label: 'Backlog',     color: '#94a3b8' },
  { status: 'todo',        label: 'To Do',       color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { status: 'review',      label: 'Review',      color: '#f59e0b' },
  { status: 'done',        label: 'Done',        color: '#22c55e' },
]

const lb = useLightbox()
const taskIdRef = computed(() => task.id)
const timer = useTaskTimer(taskIdRef)
onMounted(() => timer.fetchLogs())

function isImage(mime?: string) { return !!mime?.startsWith('image/') }
function initials(name: string) { return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?' }
function statusColor(status: string) { return COLUMNS.find(c => c.status === status)?.color ?? '#94a3b8' }
function statusLabel(status: string) { return COLUMNS.find(c => c.status === status)?.label ?? status }
const { fmtShort: fmtDate, isOverdue } = useDate()
const { timeAgo } = useTimeAgo()

function createTicketFromTask() {
  navigateTo(`/tickets/new?task_id=${task.id}&project_id=${task.project_id}&title=${encodeURIComponent(task.title)}`)
}

const { confirmDelete } = useConfirm()
async function deleteTask() {
  if (!await confirmDelete('Task ini akan dihapus permanen.', 'Hapus task?')) return
  await $fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
  emit('deleted', task.id)
  emit('close')
}

// Checklist
const newChecklistTitle = ref('')
async function addChecklistItem() {
  if (!newChecklistTitle.value.trim()) return
  const r = await $fetch<any>(`/api/tasks/${task.id}/checklist`, { method: 'POST', body: { title: newChecklistTitle.value.trim() } })
  task.checklist = [...(task.checklist || []), r.data]
  newChecklistTitle.value = ''
}
async function toggleChecklist(item: any) {
  const r = await $fetch<any>(`/api/tasks/${task.id}/checklist/${item.id}`, { method: 'PUT', body: { is_checked: !item.is_checked } })
  const idx = task.checklist.findIndex((i: any) => i.id === item.id)
  if (idx >= 0) task.checklist[idx] = r.data
  const hist = await $fetch<any>(`/api/tasks/${task.id}/history`)
  task.history = hist.data
}
async function deleteChecklistItem(itemId: number) {
  await $fetch(`/api/tasks/${task.id}/checklist/${itemId}`, { method: 'DELETE' })
  task.checklist = task.checklist.filter((i: any) => i.id !== itemId)
}

// Attachments
const taskUploading = ref(false)
async function handleTaskAttachment(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  taskUploading.value = true
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('menu', 'task')
      fd.append('project_id', String(task.project_id || ''))
      fd.append('project_name', task.project_name || '')
      const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      await $fetch(`/api/tasks/${task.id}/attachments`, { method: 'POST', body: res.data })
    }
    const refreshed = await $fetch<any>(`/api/tasks/${task.id}`)
    task.attachments = (refreshed as any).attachments || []
  } finally {
    taskUploading.value = false
    input.value = ''
  }
}
async function deleteTaskAttachment(attachId: number) {
  await $fetch(`/api/tasks/${task.id}/attachments/${attachId}`, { method: 'DELETE' })
  task.attachments = task.attachments.filter((a: any) => a.id !== attachId)
}
function openTaskLightbox(attachId: number) {
  const images = (task.attachments || [])
    .filter((a: any) => isImage(a.mime_type))
    .map((a: any) => ({ url: `/uploads/${a.filename}`, name: a.original_name, _id: a.id }))
  const idx = images.findIndex((i: any) => i._id === attachId)
  lb.open(images, idx >= 0 ? idx : 0)
}
function openCommentLightbox(comment: any, attachId: number) {
  const images = (comment.attachments || [])
    .filter((a: any) => isImage(a.mime_type))
    .map((a: any) => ({ url: `/uploads/${a.filename}`, name: a.original_name, _id: a.id }))
  const idx = images.findIndex((i: any) => i._id === attachId)
  lb.open(images, idx >= 0 ? idx : 0)
}

// Comments
const newComment = ref('')
const postingComment = ref(false)
const commentPendingFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])
const commentUploading = ref(false)

async function uploadCommentFile(file: File, name?: string) {
  const fd = new FormData()
  fd.append('file', file, name || file.name)
  fd.append('menu', 'task')
  fd.append('project_id', String(task.project_id || ''))
  fd.append('project_name', task.project_name || '')
  const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
  commentPendingFiles.value.push(res.data)
}
async function handleCommentFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  commentUploading.value = true
  try {
    for (const file of Array.from(input.files)) await uploadCommentFile(file)
  } finally {
    commentUploading.value = false
    input.value = ''
  }
}
async function handleCommentPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
  if (!items.length) return
  e.preventDefault()
  commentUploading.value = true
  try {
    for (const item of items) {
      const file = item.getAsFile()
      if (file) await uploadCommentFile(file, `paste-${Date.now()}.${item.type.split('/')[1] || 'png'}`)
    }
  } finally {
    commentUploading.value = false
  }
}
async function postComment() {
  if ((!newComment.value.trim() && !commentPendingFiles.value.length)) return
  postingComment.value = true
  try {
    const r = await $fetch<any>(`/api/tasks/${task.id}/comments`, {
      method: 'POST',
      body: { message: newComment.value.trim() || ' ', attachments: commentPendingFiles.value }
    })
    task.comments = [...(task.comments || []), r.data]
    newComment.value = ''
    commentPendingFiles.value = []
    const hist = await $fetch<any>(`/api/tasks/${task.id}/history`)
    task.history = hist.data
  } finally {
    postingComment.value = false
  }
}

// Task Participants
const taskParticipants = ref<any[]>([])
const showTaskInviteModal = ref(false)
const taskInviteSearch = ref('')
const taskInviteResults = ref<any[]>([])

onMounted(async () => {
  const r = await $fetch<any>(`/api/tasks/${task.id}/participants`).catch(() => null)
  taskParticipants.value = r?.data || []
})

function closeTaskInviteModal() {
  showTaskInviteModal.value = false
  taskInviteSearch.value = ''
  taskInviteResults.value = []
}

let taskInviteTimer: ReturnType<typeof setTimeout>
function searchTaskInviteUsers() {
  clearTimeout(taskInviteTimer)
  taskInviteTimer = setTimeout(async () => {
    if (taskInviteSearch.value.trim().length < 2) { taskInviteResults.value = []; return }
    const res = await $fetch<any>('/api/users', { query: { search: taskInviteSearch.value, role: 'customer', limit: 20 } })
    taskInviteResults.value = res?.data || []
  }, 300)
}

function isAlreadyTaskParticipant(userId: number) {
  return taskParticipants.value.some((p: any) => p.user_id === userId)
}

async function addTaskParticipant(u: any) {
  if (isAlreadyTaskParticipant(u.id)) return
  await $fetch(`/api/tasks/${task.id}/participants`, { method: 'POST', body: { user_id: u.id } })
  const r = await $fetch<any>(`/api/tasks/${task.id}/participants`)
  taskParticipants.value = r?.data || []
}

async function removeTaskParticipant(userId: number) {
  await $fetch(`/api/tasks/${task.id}/participants`, { method: 'DELETE', body: { user_id: userId } })
  taskParticipants.value = taskParticipants.value.filter((p: any) => p.user_id !== userId)
}
</script>

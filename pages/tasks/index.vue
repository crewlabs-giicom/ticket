<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ viewMode === 'kanban' ? 'Kanban board — drag cards to change status' : 'List view — all tasks' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Filters -->
        <AppSelect
          v-model="filterProject"
          :options="[{ value: '', label: 'All Projects' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
          placeholder="All Projects"
          class="w-40"
        />
        <AppSelect
          v-if="viewMode === 'list'"
          v-model="filterStatus"
          :options="[{ value: '', label: 'All Status' }, ...COLUMNS.map(c => ({ value: c.status, label: c.label }))]"
          placeholder="All Status"
          class="w-36"
        />
        <AppSelect
          v-if="viewMode === 'list'"
          v-model="filterAssignee"
          :options="[{ value: '', label: 'All Assignees' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
          placeholder="All Assignees"
          class="w-40"
        />

        <!-- View toggle -->
        <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            @click="setViewMode('list')"
            :class="['p-2 transition-colors', viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50']"
            title="List view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
          <button
            @click="setViewMode('kanban')"
            :class="['p-2 transition-colors', viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50']"
            title="Kanban view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
          </button>
        </div>

        <button @click="showCreateModal = true" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Task
        </button>
      </div>
    </div>

    <!-- Pending sync indicator -->
    <div v-if="pendingCount > 0" class="mb-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      {{ pendingCount }} action{{ pendingCount !== 1 ? 's' : '' }} pending sync
    </div>

    <!-- LIST MODE -->
    <div v-if="viewMode === 'list'">
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Title</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Project</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Assignee</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500">Due</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="!filteredListTasks.length">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">No tasks found</td>
            </tr>
            <tr
              v-for="task in filteredListTasks"
              :key="task.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              :class="{ 'opacity-60': task._tempId }"
              @click="openTask(task)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span v-if="task._tempId" class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <span class="font-medium text-gray-800">{{ task.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ task.project_name }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium" :style="{ background: statusColor(task.status) + '20', color: statusColor(task.status) }">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColor(task.status) }"></span>
                  {{ statusLabel(task.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="task.assigned_to_name" class="flex items-center gap-1.5">
                  <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold overflow-hidden">
                    <img v-if="task.assigned_to_avatar" :src="`/uploads/${task.assigned_to_avatar}`" class="w-full h-full object-cover" />
                    <span v-else>{{ initials(task.assigned_to_name) }}</span>
                  </span>
                  {{ task.assigned_to_name }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="task.due_date" :class="isOverdue(task.due_date) ? 'text-red-500 font-medium' : ''">
                  {{ formatDate(task.due_date) }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="task.ticket_count > 0" class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🎫 {{ task.ticket_count }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- KANBAN MODE — grouped by project -->
    <div v-else class="space-y-8">
      <div v-for="proj in kanbanProjects" :key="proj.id">
        <!-- Project header -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <h2 class="font-semibold text-gray-800">{{ proj.name }}</h2>
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ proj.tasks.length }} tasks</span>
        </div>

        <!-- Kanban columns for this project -->
        <div class="flex gap-4 overflow-x-auto pb-2">
          <div v-for="col in COLUMNS" :key="col.status" class="flex-shrink-0 w-64">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: col.color }"></span>
              <h3 class="font-medium text-gray-600 text-xs uppercase tracking-wide">{{ col.label }}</h3>
              <span class="bg-gray-100 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">{{ tasksByProjectAndStatus[proj.id]?.[col.status]?.length || 0 }}</span>
            </div>

            <ClientOnly>
              <draggable
                :list="tasksByProjectAndStatus[proj.id]?.[col.status] || []"
                group="tasks"
                item-key="id"
                class="min-h-16 space-y-2"
                @end="onDragEnd($event, col.status)"
              >
                <template #item="{ element }">
                  <div
                    class="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    :class="{ 'opacity-60': element._tempId }"
                    @click="openTask(element)"
                  >
                    <div v-if="element._tempId" class="text-xs text-amber-500 mb-1 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                      Pending sync
                    </div>
                    <p class="text-sm font-medium text-gray-800 leading-snug">{{ element.title }}</p>
                    <div class="flex items-center justify-between mt-2">
                      <div class="flex items-center gap-1.5">
                        <span v-if="element.ticket_count > 0" class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🎫 {{ element.ticket_count }}</span>
                        <span v-if="element.due_date" :class="['text-xs', isOverdue(element.due_date) ? 'text-red-500' : 'text-gray-400']">{{ formatDate(element.due_date) }}</span>
                      </div>
                      <span v-if="element.assigned_to_name" class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden">
                        <img v-if="element.assigned_to_avatar" :src="`/uploads/${element.assigned_to_avatar}`" class="w-full h-full object-cover" />
                        <span v-else>{{ initials(element.assigned_to_name) }}</span>
                      </span>
                    </div>
                  </div>
                </template>
              </draggable>
            </ClientOnly>

            <button
              @click="quickCreate(col.status, proj.id)"
              class="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-2 rounded-lg border border-dashed border-gray-200 flex items-center justify-center gap-1"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add
            </button>
          </div>
        </div>
      </div>

      <div v-if="!kanbanProjects.length" class="text-center text-gray-400 py-12">No tasks found</div>
    </div>

    <!-- Create task modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="() => { taskPasteImages.forEach(i => URL.revokeObjectURL(i.blobUrl)); taskPasteImages.length = 0; showCreateModal = false }">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-lg font-semibold mb-4">New Task</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <AppSelect
              v-model="form.project_id"
              :options="[{ value: '', label: 'Select project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
              placeholder="Select project"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input v-model="form.title" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Task title" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional description (Ctrl+V untuk paste gambar)" @paste="handleTaskPaste"></textarea>
            <!-- Paste image preview -->
            <div v-if="taskPasteImages.length" class="flex flex-wrap gap-2 mt-2">
              <div v-for="(img, i) in taskPasteImages" :key="i" class="relative group">
                <img :src="img.blobUrl" class="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" @click="openTaskPasteLightbox(i)" />
                <button type="button" @click="removeTaskPasteImage(i)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">×</button>
              </div>
              <p v-if="taskPasteUploading" class="text-[11px] text-indigo-500 self-center">Mengupload...</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <AppSelect
                v-model="form.status"
                :options="COLUMNS.map(c => ({ value: c.status, label: c.label }))"
                placeholder="Status"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
              <AppSelect
                v-model="form.assigned_to"
                :options="[{ value: '', label: 'Unassigned' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
                placeholder="Unassigned"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input v-model="form.due_date" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div v-if="systemMenus.length">
            <label class="block text-sm font-medium text-gray-700 mb-1">Modul / Menu Sistem</label>
            <AppSelect
              v-model="form.system_menu_id"
              :options="systemMenuOptions"
              placeholder="— Tidak dipilih —"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="() => { taskPasteImages.forEach(i => URL.revokeObjectURL(i.blobUrl)); taskPasteImages.length = 0; showCreateModal = false }" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button @click="createTask" :disabled="creating" class="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ creating ? 'Creating…' : 'Create Task' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Task detail slide-over -->
    <div v-if="selectedTask" class="fixed inset-0 bg-black/20 z-40" @click.self="selectedTask = null">
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <div class="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <span class="text-xs text-gray-400">{{ selectedTask.project_name }}</span>
            <h2 class="text-lg font-semibold text-gray-900 mt-1">{{ selectedTask.title }}</h2>
          </div>
          <button @click="selectedTask = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <p v-if="selectedTask.description" class="text-sm text-gray-600">{{ selectedTask.description }}</p>
          <div class="flex gap-4 text-sm text-gray-500">
            <span>Status: <strong class="text-gray-700">{{ COLUMNS.find(c => c.status === selectedTask.status)?.label }}</strong></span>
            <span v-if="selectedTask.assigned_to_name">Assignee: <strong class="text-gray-700">{{ selectedTask.assigned_to_name }}</strong></span>
          </div>

          <!-- Linked tickets -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-gray-700">Linked Tickets ({{ selectedTask.tickets?.length || 0 }})</h3>
              <button @click="createTicketFromTask(selectedTask)" class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Create Ticket
              </button>
            </div>
            <div v-if="selectedTask.tickets?.length" class="space-y-2">
              <NuxtLink
                v-for="tk in selectedTask.tickets" :key="tk.id"
                :to="`/tickets/${tk.id}`"
                class="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-sm"
              >
                <span class="text-indigo-600 font-mono">{{ tk.ticket_number }}</span>
                <span class="text-gray-600 truncate mx-2 flex-1">{{ tk.title }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full text-white" :style="{ background: tk.status_color }">{{ tk.status_name }}</span>
              </NuxtLink>
            </div>
            <p v-else class="text-xs text-gray-400">No tickets yet.</p>
          </div>

          <!-- Checklist -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-gray-700">Checklist</h3>
                <span v-if="selectedTask.checklist?.length" class="text-xs text-gray-400">
                  {{ selectedTask.checklist.filter((i: any) => i.is_checked).length }}/{{ selectedTask.checklist.length }}
                </span>
              </div>
            </div>
            <!-- Progress bar -->
            <div v-if="selectedTask.checklist?.length" class="w-full bg-gray-100 rounded-full h-1.5 mb-3">
              <div class="bg-indigo-500 h-1.5 rounded-full transition-all" :style="{ width: `${Math.round(selectedTask.checklist.filter((i: any) => i.is_checked).length / selectedTask.checklist.length * 100)}%` }"></div>
            </div>
            <!-- Items -->
            <div class="space-y-1.5 mb-2">
              <div v-for="item in selectedTask.checklist" :key="item.id" class="flex items-center gap-2 group">
                <input type="checkbox" :checked="item.is_checked" @change="toggleChecklist(item)" class="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
                <span :class="['text-sm flex-1', item.is_checked ? 'line-through text-gray-400' : 'text-gray-700']">{{ item.title }}</span>
                <button @click="deleteChecklistItem(item.id)" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity text-xs leading-none">×</button>
              </div>
            </div>
            <!-- Add item -->
            <div class="flex gap-2">
              <input v-model="newChecklistTitle" @keydown.enter.prevent="addChecklistItem" type="text" placeholder="Tambah poin..." class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button @click="addChecklistItem" :disabled="!newChecklistTitle.trim()" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40">Add</button>
            </div>
          </div>

          <!-- Attachments -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-gray-700">Lampiran ({{ selectedTask.attachments?.length || 0 }})</h3>
              <label class="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1" :class="taskUploading && 'opacity-50 pointer-events-none'">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Tambah File
                <input type="file" multiple class="hidden" :disabled="taskUploading" @change="handleTaskAttachment" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
              </label>
            </div>
            <div v-if="selectedTask.attachments?.length" class="flex flex-wrap gap-2 mb-2">
              <div v-for="a in selectedTask.attachments" :key="a.id" class="relative group">
                <button v-if="isImage(a.mime_type)" @click="openTaskLightbox(a.id)" class="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors shrink-0 block">
                  <img :src="`/uploads/${a.filename}`" :alt="a.original_name" class="w-full h-full object-cover" />
                </button>
                <a v-else :href="`/uploads/${a.filename}`" :download="a.original_name" target="_blank"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-700">
                  <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span class="max-w-[120px] truncate">{{ a.original_name }}</span>
                </a>
                <button @click="deleteTaskAttachment(a.id)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">×</button>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 mb-2">Belum ada lampiran.</p>
            <p v-if="taskUploading" class="text-xs text-indigo-500">Mengupload...</p>
          </div>

          <!-- Comments -->
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Komentar</h3>
            <div v-if="selectedTask.comments?.length" class="space-y-3 mb-3">
              <div v-for="c in selectedTask.comments" :key="c.id" class="flex gap-2.5">
                <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                  <img v-if="c.user_avatar" :src="`/uploads/${c.user_avatar}`" class="w-full h-full object-cover" />
                  <span v-else>{{ c.user_name?.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs font-medium text-gray-800">{{ c.user_name }}</span>
                    <span class="text-[10px] text-gray-400">{{ timeAgo(c.created_at) }}</span>
                  </div>
                  <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ c.message }}</p>
                  <!-- Comment attachments -->
                  <div v-if="c.attachments?.length" class="flex flex-wrap gap-1.5 mt-1.5">
                    <template v-for="a in c.attachments" :key="a.id">
                      <button v-if="isImage(a.mime_type)" @click="openCommentLightbox(c, a.id)" class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 shrink-0">
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
            <!-- Comment pending files preview -->
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
            <div class="flex gap-2 items-end">
              <div class="flex-1">
                <textarea v-model="newComment" rows="2" placeholder="Tulis komentar... (Ctrl+V untuk paste gambar)" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" @paste="handleCommentPaste"></textarea>
                <div class="flex items-center gap-2 mt-1">
                  <label class="cursor-pointer text-[11px] text-gray-400 hover:text-indigo-600 flex items-center gap-1" :class="commentUploading && 'opacity-50 pointer-events-none'">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    Lampirkan file
                    <input type="file" multiple class="hidden" :disabled="commentUploading" @change="handleCommentFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
                  </label>
                  <span v-if="commentUploading" class="text-[11px] text-indigo-500">Mengupload...</span>
                </div>
              </div>
              <button @click="postComment" :disabled="(!newComment.trim() && !commentPendingFiles.length) || postingComment || commentUploading" class="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 self-end">Post</button>
            </div>
          </div>

          <!-- Activity History -->
          <div v-if="selectedTask.history?.length">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Activity</h3>
            <div class="space-y-2">
              <div v-for="h in selectedTask.history" :key="h.id" class="flex gap-2.5 items-start">
                <div class="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
                <div class="flex-1">
                  <p class="text-xs text-gray-600">{{ h.label }}</p>
                  <p class="text-[10px] text-gray-400 mt-0.5">{{ timeAgo(h.created_at) }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex gap-2 border-t border-gray-100">
            <button @click="deleteTask(selectedTask.id)" class="text-xs text-red-500 hover:text-red-700">Delete task</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const draggable = defineAsyncComponent(() => import('vuedraggable'))

definePageMeta({ middleware: 'auth' })

const COLUMNS = [
  { status: 'backlog',     label: 'Backlog',      color: '#94a3b8' },
  { status: 'todo',        label: 'To Do',         color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress',   color: '#3b82f6' },
  { status: 'review',      label: 'Review',        color: '#f59e0b' },
  { status: 'done',        label: 'Done',           color: '#22c55e' },
]

const { pendingCount } = useSync()

// View mode — persisted to localStorage
const viewMode = ref<'list' | 'kanban'>('kanban')

onMounted(() => {
  const saved = localStorage.getItem('task_view_mode')
  if (saved === 'list' || saved === 'kanban') viewMode.value = saved
})

function setViewMode(mode: 'list' | 'kanban') {
  viewMode.value = mode
  localStorage.setItem('task_view_mode', mode)
}

// Filters
const filterProject = ref('')
const filterStatus = ref('')
const filterAssignee = ref('')

const tasks = ref<any[]>([])
const projects = ref<any[]>([])
const staffUsers = ref<any[]>([])
const showCreateModal = ref(false)
const creating = ref(false)
const selectedTask = ref<any>(null)

const systemMenus = ref<any[]>([])
const systemMenuOptions = computed(() => {
  const opts: any[] = [{ value: '', label: '— Tidak dipilih —' }]
  const byModule: Record<string, any[]> = {}
  for (const item of systemMenus.value) {
    if (!byModule[item.module]) byModule[item.module] = []
    byModule[item.module].push(item)
  }
  for (const [mod, items] of Object.entries(byModule)) {
    opts.push({ group: mod })
    for (const item of items) {
      const label = item.type
        ? `${mod} › ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} › ${item.name}`
        : mod
      opts.push({ value: item.id, label })
    }
  }
  return opts
})

const form = reactive({
  project_id: '',
  title: '',
  description: '',
  status: 'backlog',
  assigned_to: '',
  due_date: '',
  system_menu_id: '',
})

const lb = useLightbox()
function isImage(mime?: string) { return !!mime?.startsWith('image/') }
const taskPasteImages = ref<Array<{ blobUrl: string; name: string; file: File }>>([])
const taskPasteUploading = ref(false)

function handleTaskPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'))
  if (!items.length) return
  e.preventDefault()
  for (const item of items) {
    const file = item.getAsFile()
    if (file) {
      const ext = item.type.split('/')[1] || 'png'
      const name = `paste-${Date.now()}.${ext}`
      taskPasteImages.value.push({ blobUrl: URL.createObjectURL(file), name, file })
    }
  }
}

function openTaskPasteLightbox(idx: number) {
  lb.open(taskPasteImages.value.map(i => ({ url: i.blobUrl, name: i.name })), idx)
}

function removeTaskPasteImage(idx: number) {
  URL.revokeObjectURL(taskPasteImages.value[idx].blobUrl)
  taskPasteImages.value.splice(idx, 1)
}

// List mode: flat filtered tasks
const filteredListTasks = computed(() => {
  return tasks.value.filter(t => {
    if (filterProject.value && String(t.project_id) !== String(filterProject.value)) return false
    if (filterStatus.value && t.status !== filterStatus.value) return false
    if (filterAssignee.value && String(t.assigned_to) !== String(filterAssignee.value)) return false
    return true
  })
})

// Kanban mode: group by project, then by status
const kanbanProjects = computed(() => {
  const filtered = filterProject.value
    ? tasks.value.filter(t => String(t.project_id) === String(filterProject.value))
    : tasks.value

  const projMap = new Map<number, { id: number; name: string; tasks: any[] }>()
  for (const t of filtered) {
    if (!projMap.has(t.project_id)) {
      projMap.set(t.project_id, { id: t.project_id, name: t.project_name, tasks: [] })
    }
    projMap.get(t.project_id)!.tasks.push(t)
  }
  return [...projMap.values()]
})

const tasksByProjectAndStatus = computed(() => {
  const result: Record<number, Record<string, any[]>> = {}
  for (const proj of kanbanProjects.value) {
    result[proj.id] = {}
    for (const col of COLUMNS) result[proj.id][col.status] = []
    for (const t of proj.tasks) {
      const bucket = result[proj.id][t.status] ?? result[proj.id]['backlog']
      bucket.push(t)
    }
  }
  return result
})

async function loadTasks() {
  const url = filterProject.value ? `/api/tasks?project_id=${filterProject.value}` : '/api/tasks'
  tasks.value = await $fetch(url)
}

async function loadProjects() {
  projects.value = (await $fetch<any>('/api/projects'))?.data || []
}

async function loadUsers() {
  const res = await $fetch<any>('/api/users')
  const all = res?.data ?? []
  staffUsers.value = all.filter((u: any) => u.role === 'staff' || u.role === 'admin')
}

async function loadSystemMenus(projectId?: string | number) {
  const url = projectId ? `/api/system-menus?project_id=${projectId}` : '/api/system-menus'
  const res = await $fetch<any>(url).catch(() => null)
  systemMenus.value = res?.data || []
}

watch(filterProject, loadTasks)

watch(() => form.project_id, (val) => {
  form.system_menu_id = ''
  loadSystemMenus(val || undefined)
})

onMounted(async () => {
  await Promise.all([loadTasks(), loadProjects(), loadUsers(), loadSystemMenus()])
})

// Helpers
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function statusColor(status: string) {
  return COLUMNS.find(c => c.status === status)?.color ?? '#94a3b8'
}

function statusLabel(status: string) {
  return COLUMNS.find(c => c.status === status)?.label ?? status
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string) {
  return new Date(d) < new Date()
}

async function openTask(task: any) {
  newChecklistTitle.value = ''
  newComment.value = ''
  const detail = await $fetch<any>(`/api/tasks/${task.id}`)
  selectedTask.value = detail
}

function quickCreate(status: string, projectId?: number) {
  form.status = status
  if (projectId) form.project_id = String(projectId)
  showCreateModal.value = true
}

async function createTask() {
  if (!form.project_id || !form.title.trim()) return
  creating.value = true
  try {
    let description = form.description || ''
    if (taskPasteImages.value.length) {
      taskPasteUploading.value = true
      for (const img of taskPasteImages.value) {
        const fd = new FormData()
        fd.append('file', img.file, img.name)
        fd.append('menu', 'task')
        if (form.project_id) {
          const proj = projects.value?.find((p: any) => String(p.id) === String(form.project_id))
          fd.append('project_id', String(form.project_id))
          fd.append('project_name', proj?.name || '')
        }
        const r = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
        description += `\n\n![${img.name}](/uploads/${r.data.filename})`
      }
      taskPasteImages.value.forEach(i => URL.revokeObjectURL(i.blobUrl))
      taskPasteImages.value = []
      taskPasteUploading.value = false
    }
    await performAction('task', 'create', `tmp_${Date.now()}`, {
      project_id: Number(form.project_id),
      title: form.title.trim(),
      description: description || undefined,
      status: form.status,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      due_date: form.due_date || undefined,
      system_menu_id: form.system_menu_id ? Number(form.system_menu_id) : undefined,
    })
    await loadTasks()
    showCreateModal.value = false
    Object.assign(form, { project_id: '', title: '', description: '', status: 'backlog', assigned_to: '', due_date: '', system_menu_id: '' })
  } finally {
    creating.value = false
    taskPasteUploading.value = false
  }
}

async function onDragEnd(evt: any, toStatus: string) {
  const allColTasks = Object.values(tasksByProjectAndStatus.value)
    .flatMap(proj => proj[toStatus] ?? [])
  for (let i = 0; i < allColTasks.length; i++) {
    const t = allColTasks[i]
    if (t.status !== toStatus || t.position !== i) {
      t.status = toStatus
      t.position = i
      await performAction('task', 'update', t.id, { status: toStatus, position: i })
    }
  }
}

async function deleteTask(id: number) {
  if (!confirm('Delete this task?')) return
  await performAction('task', 'delete', id, {})
  selectedTask.value = null
  await loadTasks()
}

// Checklist
const newChecklistTitle = ref('')
async function addChecklistItem() {
  if (!newChecklistTitle.value.trim() || !selectedTask.value) return
  const r = await $fetch<any>(`/api/tasks/${selectedTask.value.id}/checklist`, { method: 'POST', body: { title: newChecklistTitle.value.trim() } })
  selectedTask.value.checklist = [...(selectedTask.value.checklist || []), r.data]
  newChecklistTitle.value = ''
}
async function toggleChecklist(item: any) {
  const r = await $fetch<any>(`/api/tasks/${selectedTask.value!.id}/checklist/${item.id}`, { method: 'PUT', body: { is_checked: !item.is_checked } })
  const idx = selectedTask.value!.checklist.findIndex((i: any) => i.id === item.id)
  if (idx >= 0) selectedTask.value!.checklist[idx] = r.data
  // refresh history
  const hist = await $fetch<any>(`/api/tasks/${selectedTask.value!.id}/history`)
  selectedTask.value!.history = hist.data
}
async function deleteChecklistItem(itemId: number) {
  await $fetch(`/api/tasks/${selectedTask.value!.id}/checklist/${itemId}`, { method: 'DELETE' })
  selectedTask.value!.checklist = selectedTask.value!.checklist.filter((i: any) => i.id !== itemId)
}

// Attachments
const taskUploading = ref(false)

async function handleTaskAttachment(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !selectedTask.value) return
  taskUploading.value = true
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('menu', 'task')
      fd.append('project_id', String(selectedTask.value.project_id || ''))
      fd.append('project_name', selectedTask.value.project_name || '')
      const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      await $fetch(`/api/tasks/${selectedTask.value.id}/attachments`, { method: 'POST', body: res.data })
    }
    const refreshed = await $fetch<any>(`/api/tasks/${selectedTask.value.id}`)
    selectedTask.value.attachments = refreshed.attachments || []
  } finally {
    taskUploading.value = false
    input.value = ''
  }
}

async function deleteTaskAttachment(attachId: number) {
  if (!selectedTask.value) return
  await $fetch(`/api/tasks/${selectedTask.value.id}/attachments/${attachId}`, { method: 'DELETE' })
  selectedTask.value.attachments = selectedTask.value.attachments.filter((a: any) => a.id !== attachId)
}

function openTaskLightbox(attachId: number) {
  const images = (selectedTask.value?.attachments || [])
    .filter((a: any) => isImage(a.mime_type))
    .map((a: any) => ({ url: `/uploads/${a.filename}`, name: a.original_name, id: a.id }))
  const idx = images.findIndex((i: any) => i.id === attachId)
  lb.open(images.map((i: any) => ({ url: i.url, name: i.name })), idx >= 0 ? idx : 0)
}

function openCommentLightbox(comment: any, attachId: number) {
  const images = (comment.attachments || [])
    .filter((a: any) => isImage(a.mime_type))
    .map((a: any) => ({ url: `/uploads/${a.filename}`, name: a.original_name, id: a.id }))
  const idx = images.findIndex((i: any) => i.id === attachId)
  lb.open(images.map((i: any) => ({ url: i.url, name: i.name })), idx >= 0 ? idx : 0)
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
  fd.append('project_id', String(selectedTask.value?.project_id || ''))
  fd.append('project_name', selectedTask.value?.project_name || '')
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
  if ((!newComment.value.trim() && !commentPendingFiles.value.length) || !selectedTask.value) return
  postingComment.value = true
  try {
    const r = await $fetch<any>(`/api/tasks/${selectedTask.value.id}/comments`, {
      method: 'POST',
      body: { message: newComment.value.trim() || ' ', attachments: commentPendingFiles.value }
    })
    selectedTask.value.comments = [...(selectedTask.value.comments || []), r.data]
    newComment.value = ''
    commentPendingFiles.value = []
    const hist = await $fetch<any>(`/api/tasks/${selectedTask.value.id}/history`)
    selectedTask.value.history = hist.data
  } finally {
    postingComment.value = false
  }
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j lalu`
  return `${Math.floor(h / 24)}h lalu`
}

function createTicketFromTask(task: any) {
  navigateTo(`/tickets/new?task_id=${task.id}&project_id=${task.project_id}&title=${encodeURIComponent(task.title)}`)
}
</script>

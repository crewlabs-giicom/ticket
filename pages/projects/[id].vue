<template>
  <div v-if="project" class="space-y-0">
    <!-- ── Header ── -->
    <div class="bg-white border-b border-slate-200 px-6 py-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/projects" class="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </NuxtLink>
          <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl font-bold text-slate-900">{{ project.name }}</h1>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', statusStyle(project.status).class]">
                {{ statusStyle(project.status).label }}
              </span>
            </div>
            <p v-if="project.description" class="text-sm text-slate-500 mt-0.5 truncate max-w-xl">{{ project.description }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Member avatars -->
          <div class="flex items-center mr-1">
            <div
              v-for="(m, i) in (project.members || []).slice(0, 4)" :key="m.id"
              class="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden"
              :style="{ marginLeft: i === 0 ? '0' : '-8px' }"
              :title="m.name"
            >
              <img v-if="m.avatar" :src="`/uploads/${m.avatar}`" class="w-full h-full object-cover" />
              <span v-else>{{ initials(m.name) }}</span>
            </div>
            <span
              v-if="project.member_count > 4"
              class="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-slate-500"
              style="margin-left: -8px"
            >+{{ project.member_count - 4 }}</span>
            <span v-if="!project.member_count" class="text-xs text-slate-400 mr-2">0 member</span>
          </div>

          <button v-if="auth.isAdmin" @click="openEdit" class="btn-ghost text-sm flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit
          </button>
          <button @click="showCreateModal = true" class="btn-primary text-sm flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Task
          </button>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <div class="flex items-center gap-1 mt-5 -mb-5 border-t border-slate-100 pt-4">
        <button
          v-for="tab in TABS" :key="tab.key"
          @click="setTab(tab.key)"
          :class="['px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors', activeTab === tab.key ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50']"
        >{{ tab.label }}</button>
      </div>
    </div>

    <!-- Pending sync -->
    <div v-if="pendingCount > 0" class="mx-6 mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      {{ pendingCount }} action{{ pendingCount !== 1 ? 's' : '' }} pending sync
    </div>

    <!-- ── Tab content ── -->
    <div class="p-6">

      <!-- ─ OVERVIEW ─ -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <!-- Progress bar -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-slate-700">Task Progress</h3>
            <span class="text-xs text-slate-400">{{ project.task_done ?? 0 }} / {{ project.task_count ?? 0 }} done</span>
          </div>
          <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all"
              :style="{ width: taskProgress + '%' }"
            ></div>
          </div>
          <div class="flex items-center gap-6 mt-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-lg">✅</span>
              <div><p class="font-semibold text-slate-800">{{ project.task_done ?? 0 }}</p><p class="text-xs text-slate-400">Done</p></div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">⏳</span>
              <div><p class="font-semibold text-slate-800">{{ project.task_waiting ?? 0 }}</p><p class="text-xs text-slate-400">In Progress</p></div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">🔴</span>
              <div><p class="font-semibold" :class="(project.task_overdue ?? 0) > 0 ? 'text-red-600' : 'text-slate-800'">{{ project.task_overdue ?? 0 }}</p><p class="text-xs text-slate-400">Overdue</p></div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">🎫</span>
              <div><p class="font-semibold text-slate-800">{{ project.ticket_count ?? 0 }}</p><p class="text-xs text-slate-400">Tickets</p></div>
            </div>
          </div>
        </div>

        <!-- Members -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-slate-700">Members ({{ project.member_count ?? 0 }})</h3>
            <button v-if="auth.isAdmin" @click="setTab('members')" class="text-xs text-indigo-600 hover:text-indigo-800">Kelola →</button>
          </div>
          <div v-if="project.members?.length" class="flex flex-wrap gap-3">
            <div v-for="m in project.members" :key="m.id" class="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img v-if="m.avatar" :src="`/uploads/${m.avatar}`" class="w-full h-full object-cover" />
                <span v-else>{{ initials(m.name) }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-800 leading-none">{{ m.name }}</p>
                <p class="text-xs text-slate-400 capitalize mt-0.5">{{ m.role }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400">Belum ada member. <button v-if="auth.isAdmin" @click="setTab('members')" class="text-indigo-600 hover:underline">Tambah →</button></p>
        </div>
      </div>

      <!-- ─ TASKS ─ -->
      <div v-else-if="activeTab === 'tasks'" class="space-y-4">
        <!-- Toolbar: filter status + view toggle -->
        <div class="flex items-center gap-3 flex-wrap">
          <AppSelect
            v-if="taskViewMode === 'list'"
            v-model="taskFilterStatus"
            :options="[{ value: '', label: 'All Status' }, ...COLUMNS.map(c => ({ value: c.status, label: c.label }))]"
            placeholder="All Status"
            class="w-36"
          />
          <AppSelect
            v-if="taskViewMode === 'list'"
            v-model="taskFilterAssignee"
            :options="[{ value: '', label: 'All Assignees' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="All Assignees"
            class="w-40"
          />
          <div class="ml-auto flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              @click="setTaskViewMode('list')"
              :class="['p-2 transition-colors', taskViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50']"
              title="List view"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
            <button
              @click="setTaskViewMode('kanban')"
              :class="['p-2 transition-colors', taskViewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50']"
              title="Kanban view"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
            </button>
          </div>
        </div>

        <!-- List view -->
        <div v-if="taskViewMode === 'list'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div v-if="tasksLoading" class="flex items-center justify-center py-12 text-slate-400">
            <svg class="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Memuat…
          </div>
          <table v-else class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Judul</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Assignee</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Due</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!filteredProjectTasks.length">
                <td colspan="5" class="px-4 py-10 text-center text-slate-400">Belum ada task.</td>
              </tr>
              <tr
                v-for="task in filteredProjectTasks" :key="task.id"
                class="hover:bg-slate-50 cursor-pointer transition-colors"
                :class="{ 'opacity-60': task._tempId }"
                @click="openTaskDetail(task)"
              >
                <td class="px-4 py-3 font-medium text-slate-800">{{ task.title }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
                    :style="{ background: colColor(task.status) + '20', color: colColor(task.status) }">
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ background: colColor(task.status) }"></span>
                    {{ colLabel(task.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500">
                  <span v-if="task.assigned_to_name" class="flex items-center gap-1.5">
                    <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-semibold">{{ initials(task.assigned_to_name) }}</span>
                    {{ task.assigned_to_name }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="task.due_date" :class="['text-xs', isOverdue(task.due_date) ? 'text-red-500 font-medium' : 'text-slate-400']">{{ fmtDate(task.due_date) }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="task.ticket_count > 0" class="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🎫 {{ task.ticket_count }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Kanban view -->
        <task-kanban-board
          v-else
          ref="kanbanRef"
          :filter-project="projectId"
          @quick-add="onKanbanQuickAdd"
          @task-deleted="() => { loadProjectTasks(); refreshProject() }"
        />
      </div>

      <!-- Task detail slide-over (list mode) -->
      <TaskDetailPanel
        v-if="selectedTask"
        :task="selectedTask"
        @close="selectedTask = null"
        @deleted="onTaskDeleted"
      />

      <!-- ─ TICKETS ─ -->
      <div v-else-if="activeTab === 'tickets'">
        <div v-if="ticketsLoading" class="flex items-center justify-center py-12 text-slate-400">
          <svg class="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Memuat tiket…
        </div>
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Nomor</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Judul</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Prioritas</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Assignee</th>
                <th class="text-left px-4 py-3 font-medium text-slate-500">Dibuat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!tickets.length">
                <td colspan="6" class="px-4 py-10 text-center text-slate-400">Belum ada tiket untuk project ini.</td>
              </tr>
              <tr
                v-for="tk in tickets" :key="tk.id"
                class="hover:bg-slate-50 cursor-pointer transition-colors"
                @click="navigateTo(`/tickets/${tk.id}`)"
              >
                <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ tk.ticket_number }}</td>
                <td class="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{{ tk.title }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white" :style="{ background: tk.status_color }">{{ tk.status_name }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 text-xs">
                    <span class="w-2 h-2 rounded-full" :style="{ background: tk.priority_color }"></span>
                    {{ tk.priority_name }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500 text-xs">{{ tk.assigned_to_name || '—' }}</td>
                <td class="px-4 py-3 text-slate-400 text-xs">{{ timeAgo(tk.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─ MEMBERS ─ -->
      <div v-else-if="activeTab === 'members'" class="space-y-4">
        <!-- Add member (admin only) -->
        <div v-if="auth.isAdmin" class="card p-4 flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-xs font-medium text-slate-600 mb-1">Tambah Member</label>
            <AppSelect
              v-model="addMemberId"
              :options="[{ value: '', label: 'Pilih user…' }, ...availableUsers.map((u: any) => ({ value: u.id, label: `${u.name} (${u.role})` }))]"
              placeholder="Pilih user…"
            />
          </div>
          <button
            @click="addMember"
            :disabled="!addMemberId || memberSaving"
            class="btn-primary text-sm disabled:opacity-50 flex-shrink-0"
          >{{ memberSaving ? 'Menambah…' : 'Tambah' }}</button>
        </div>

        <!-- Member list -->
        <div class="card overflow-hidden">
          <div v-if="!members.length" class="p-6 text-center text-slate-400 text-sm">Belum ada member.</div>
          <div v-else class="divide-y divide-slate-100">
            <div v-for="m in members" :key="m.id" class="flex items-center gap-3 px-5 py-3.5">
              <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img v-if="m.avatar" :src="`/uploads/${m.avatar}`" class="w-full h-full object-cover" />
                <span v-else>{{ initials(m.name) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800">{{ m.name }}</p>
                <p class="text-xs text-slate-400">{{ m.email }} · <span class="capitalize">{{ m.role }}</span></p>
              </div>
              <button
                v-if="auth.isAdmin"
                @click="removeMember(m.id)"
                class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >Hapus</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─ SYSTEM MENUS ─ -->
      <div v-else-if="activeTab === 'system-menus'" class="space-y-4">
        <div v-if="auth.isAdmin" class="card p-4 space-y-3">
          <h3 class="text-sm font-semibold text-slate-700">Tambah Menu Sistem</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Modul</label>
              <input v-model="smForm.module" type="text" class="input w-full" placeholder="Nama modul…" />
            </div>
            <div>
              <label class="label">Tipe</label>
              <AppSelect v-model="smForm.type" :options="[{ value: '', label: '— Pilih —' }, { value: 'Master', label: 'Master' }, { value: 'Transaction', label: 'Transaction' }, { value: 'Report', label: 'Report' }]" placeholder="— Pilih —" />
            </div>
          </div>
          <div>
            <label class="label">Nama Menu</label>
            <input v-model="smForm.name" type="text" class="input w-full" placeholder="Nama menu…" />
          </div>
          <div class="flex justify-end">
            <button @click="addSystemMenu" :disabled="smSaving || !smForm.module.trim()" class="btn-primary text-sm disabled:opacity-50">
              {{ smSaving ? 'Menyimpan…' : 'Tambah' }}
            </button>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div v-if="!projectSystemMenus.length" class="p-6 text-center text-slate-400 text-sm">Belum ada menu sistem untuk project ini.</div>
          <div v-else>
            <div v-for="(items, mod) in groupedSystemMenus" :key="mod" class="border-b border-slate-100 last:border-0">
              <div class="px-5 py-2 bg-slate-50 flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ mod }}</span>
              </div>
              <div v-for="item in items" :key="item.id" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 border-t border-slate-50">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800">{{ item.name || '—' }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ item.type || 'Umum' }}</p>
                </div>
                <span :class="['text-xs px-2 py-0.5 rounded-full', item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500']">
                  {{ item.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
                <button v-if="auth.isAdmin" @click="deleteSystemMenu(item.id)" class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create task modal ── -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showCreateModal = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-lg font-semibold mb-4">New Task — {{ project.name }}</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input v-model="taskForm.title" type="text" class="input w-full" placeholder="Task title" autofocus />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea v-model="taskForm.description" rows="3" class="input w-full resize-none" placeholder="Opsional…"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <AppSelect
                v-model="taskForm.status"
                :options="COLUMNS.map(c => ({ value: c.status, label: c.label }))"
                placeholder="Status"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
              <AppSelect
                v-model="taskForm.assigned_to"
                :options="[{ value: '', label: 'Unassigned' }, ...staffUsers.map((u: any) => ({ value: u.id, label: u.name }))]"
                placeholder="Unassigned"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input v-model="taskForm.due_date" type="date" class="input w-full" />
          </div>
          <div v-if="projectSystemMenus.length">
            <label class="block text-sm font-medium text-slate-700 mb-1">Modul / Menu Sistem</label>
            <AppSelect
              v-model="taskForm.system_menu_id"
              :options="[{ value: '', label: '— Tidak dipilih —' }, ...projectSystemMenus.map((m: any) => ({ value: m.id, label: m.name ? `[${m.module}] ${m.name}` : m.module }))]"
              placeholder="— Tidak dipilih —"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showCreateModal = false" class="btn-ghost">Batal</button>
          <button @click="createTask" :disabled="creating || !taskForm.title.trim()" class="btn-primary disabled:opacity-50">
            {{ creating ? 'Membuat…' : 'Buat Task' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Edit project modal ── -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showEditModal = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Edit Project</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nama *</label>
            <input v-model="editForm.name" type="text" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
            <textarea v-model="editForm.description" rows="3" class="input w-full resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <AppSelect
              v-model="editForm.status"
              :options="[{ value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' }, { value: 'completed', label: 'Completed' }]"
              placeholder="Status"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showEditModal = false" class="btn-ghost">Batal</button>
          <button @click="saveEdit" :disabled="editSaving || !editForm.name.trim()" class="btn-primary disabled:opacity-50">
            {{ editSaving ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">Project tidak ditemukan.</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const TABS = [
  { key: 'overview',      label: 'Overview' },
  { key: 'tasks',         label: 'Tasks' },
  { key: 'tickets',       label: 'Tickets' },
  { key: 'members',       label: 'Members' },
  { key: 'system-menus',  label: 'System Menus' },
] as const
type TabKey = typeof TABS[number]['key']

const COLUMNS = [
  { status: 'backlog',     label: 'Backlog',      color: '#94a3b8' },
  { status: 'todo',        label: 'To Do',         color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress',   color: '#3b82f6' },
  { status: 'review',      label: 'Review',        color: '#f59e0b' },
  { status: 'done',        label: 'Done',           color: '#22c55e' },
]

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  active:    { label: 'Active',     class: 'bg-emerald-100 text-emerald-700' },
  on_hold:   { label: 'On Hold',   class: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', class: 'bg-slate-100 text-slate-500' },
}
function statusStyle(s: string) { return STATUS_STYLES[s] ?? STATUS_STYLES.active }

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const projectId = Number(route.params.id)
const { pendingCount } = useSync()

// ── Tab state (URL-driven) ──────────────────────────────────────────────────
const activeTab = computed<TabKey>({
  get() {
    const q = route.query.tab as string
    return (TABS.map(t => t.key) as string[]).includes(q) ? q as TabKey : 'overview'
  },
  set(v) { setTab(v) },
})

function setTab(key: TabKey) {
  router.replace({ query: { ...route.query, tab: key } })
}

// ── Project data ─────────────────────────────────────────────────────────────
const { data: projectRes, refresh: refreshProject } = await useFetch(`/api/projects/${projectId}`)
const project = computed(() => (projectRes.value as any)?.data ?? null)

const taskProgress = computed(() => {
  const total = project.value?.task_count ?? 0
  const done = project.value?.task_done ?? 0
  return total > 0 ? Math.round((done / total) * 100) : 0
})

// ── Users for dropdowns ───────────────────────────────────────────────────────
const allUsers = ref<any[]>([])
const staffUsers = computed(() => allUsers.value.filter(u => u.role === 'staff' || u.role === 'admin'))

onMounted(async () => {
  const res = await $fetch<any>('/api/users')
  allUsers.value = res?.data ?? res ?? []
})

// ── Members tab ──────────────────────────────────────────────────────────────
const members = ref<any[]>([])
const addMemberId = ref<number | ''>('')
const memberSaving = ref(false)

const memberIds = computed(() => new Set(members.value.map(m => m.id)))
const availableUsers = computed(() => allUsers.value.filter(u => !memberIds.value.has(u.id)))

async function loadMembers() {
  const res = await $fetch<any>(`/api/projects/${projectId}/members`)
  members.value = res?.data ?? []
}

async function addMember() {
  if (!addMemberId.value) return
  memberSaving.value = true
  try {
    await $fetch(`/api/projects/${projectId}/members`, { method: 'POST', body: { user_id: addMemberId.value } })
    addMemberId.value = ''
    await Promise.all([loadMembers(), refreshProject()])
  } finally {
    memberSaving.value = false
  }
}

const { confirmDelete } = useConfirm()
async function removeMember(userId: number) {
  if (!await confirmDelete('Member ini akan dihapus dari project.', 'Hapus member?')) return
  await $fetch(`/api/projects/${projectId}/members`, { method: 'DELETE', body: { user_id: userId } })
  await Promise.all([loadMembers(), refreshProject()])
}

watch(() => activeTab.value, (tab) => {
  if (tab === 'members') loadMembers()
}, { immediate: true })

// ── Tickets tab ───────────────────────────────────────────────────────────────
const tickets = ref<any[]>([])
const ticketsLoading = ref(false)

async function loadTickets() {
  ticketsLoading.value = true
  try {
    const ticketRes = await $fetch<any>(`/api/tickets?project_id=${projectId}`)
    tickets.value = ticketRes?.data || []
  } finally {
    ticketsLoading.value = false
  }
}

watch(() => activeTab.value, (tab) => {
  if (tab === 'tickets' && !tickets.value.length) loadTickets()
})

// ── Tasks — view mode ────────────────────────────────────────────────────────
const taskViewMode = ref<'list' | 'kanban'>('kanban')

onMounted(() => {
  const saved = localStorage.getItem('task_view_mode')
  if (saved === 'list' || saved === 'kanban') taskViewMode.value = saved
})

function setTaskViewMode(mode: 'list' | 'kanban') {
  taskViewMode.value = mode
  localStorage.setItem('task_view_mode', mode)
}

// ── Tasks — list mode data ────────────────────────────────────────────────────
const projectTasks = ref<any[]>([])
const tasksLoading = ref(false)
const taskFilterStatus = ref('')
const taskFilterAssignee = ref<number | ''>('')
const selectedTask = ref<any>(null)

const filteredProjectTasks = computed(() => {
  return projectTasks.value.filter(t => {
    if (taskFilterStatus.value && t.status !== taskFilterStatus.value) return false
    if (taskFilterAssignee.value && String(t.assigned_to) !== String(taskFilterAssignee.value)) return false
    return true
  })
})

async function loadProjectTasks() {
  tasksLoading.value = true
  try {
    projectTasks.value = await $fetch<any[]>(`/api/tasks?project_id=${projectId}&paginate=false`) as any[]
  } finally {
    tasksLoading.value = false
  }
}

async function openTaskDetail(task: any) {
  selectedTask.value = await $fetch<any>(`/api/tasks/${task.id}`)
}

async function onTaskDeleted() {
  selectedTask.value = null
  await loadProjectTasks()
  await refreshProject()
}

// Load list tasks when tab opens or view switches to list
watch([() => activeTab.value, taskViewMode], ([tab, mode]) => {
  if (tab === 'tasks' && mode === 'list') loadProjectTasks()
}, { immediate: true })

// ── Tasks (KanbanBoard) ───────────────────────────────────────────────────────
const kanbanRef = ref<any>(null)
const showCreateModal = ref(false)
const creating = ref(false)

const taskForm = reactive({ title: '', description: '', status: 'backlog', assigned_to: '', due_date: '', system_menu_id: '' })

function onKanbanQuickAdd(payload: { status: string }) {
  taskForm.status = payload.status
  showCreateModal.value = true
}

async function createTask() {
  if (!taskForm.title.trim()) return
  creating.value = true
  try {
    await performAction('task', 'create', `tmp_${Date.now()}`, {
      project_id: projectId,
      title: taskForm.title.trim(),
      description: taskForm.description || undefined,
      status: taskForm.status,
      assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : undefined,
      due_date: taskForm.due_date || undefined,
      system_menu_id: taskForm.system_menu_id ? Number(taskForm.system_menu_id) : undefined,
    })
    showCreateModal.value = false
    Object.assign(taskForm, { title: '', description: '', status: 'backlog', assigned_to: '', due_date: '', system_menu_id: '' })
    if (taskViewMode.value === 'list') await loadProjectTasks()
    else kanbanRef.value?.load()
    await refreshProject()
  } finally {
    creating.value = false
  }
}

// ── System Menus tab ──────────────────────────────────────────────────────────
const projectSystemMenus = ref<any[]>([])
const smForm = reactive({ module: '', type: '', name: '' })
const smSaving = ref(false)

const groupedSystemMenus = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const item of projectSystemMenus.value) {
    if (!groups[item.module]) groups[item.module] = []
    groups[item.module].push(item)
  }
  return groups
})

async function loadSystemMenus() {
  const res = await $fetch<any>(`/api/system-menus?project_id=${projectId}`)
  projectSystemMenus.value = res?.data || []
}

async function addSystemMenu() {
  if (!smForm.module.trim()) return
  smSaving.value = true
  try {
    await $fetch('/api/system-menus', {
      method: 'POST',
      body: { module: smForm.module.trim(), type: smForm.type || null, name: smForm.name.trim() || null, project_id: projectId }
    })
    Object.assign(smForm, { module: '', type: '', name: '' })
    await loadSystemMenus()
  } finally {
    smSaving.value = false
  }
}

async function deleteSystemMenu(id: number) {
  if (!await confirmDelete('Menu sistem ini akan dihapus permanen.', 'Hapus menu sistem?')) return
  await $fetch(`/api/system-menus/${id}`, { method: 'DELETE' })
  await loadSystemMenus()
}

watch(() => activeTab.value, (tab) => {
  if (tab === 'system-menus') loadSystemMenus()
})

onMounted(() => { loadSystemMenus() })

// ── Edit project ──────────────────────────────────────────────────────────────
const showEditModal = ref(false)
const editSaving = ref(false)
const editForm = reactive({ name: '', description: '', status: 'active' })

function openEdit() {
  editForm.name = project.value?.name ?? ''
  editForm.description = project.value?.description ?? ''
  editForm.status = project.value?.status ?? 'active'
  showEditModal.value = true
}

async function saveEdit() {
  if (!editForm.name.trim()) return
  editSaving.value = true
  try {
    await $fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: { name: editForm.name.trim(), description: editForm.description, status: editForm.status, is_active: 1 },
    })
    showEditModal.value = false
    await refreshProject()
  } finally {
    editSaving.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function colColor(status: string) { return COLUMNS.find(c => c.status === status)?.color ?? '#94a3b8' }
function colLabel(status: string) { return COLUMNS.find(c => c.status === status)?.label ?? status }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }
function isOverdue(d: string) { return new Date(d) < new Date() }

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'
}

const { timeAgo } = useTimeAgo()
</script>

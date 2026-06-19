<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Buat Ticket Baru</h2>
          <p v-if="taskId" class="text-xs text-indigo-600 mt-0.5">Dari task: {{ props.taskTitle }}</p>
        </div>
        <button @click="$emit('close')" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
      <form @submit.prevent="submit" class="p-6 space-y-4">
        <div><label class="label">Judul <span class="text-red-500">*</span></label><input v-model="form.title" class="input" placeholder="Deskripsi singkat masalah" required /></div>
        <div><label class="label">Project <span class="text-red-500">*</span></label>
          <AppSelect
            v-model="form.project_id"
            :options="[{ value: '', label: 'Pilih project' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
            placeholder="Pilih project"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Priority</label>
            <AppSelect
              v-model="form.priority_id"
              :options="priorities.map((p: any) => ({ value: p.id, label: p.name }))"
              placeholder="Priority"
            />
          </div>
          <div><label class="label">Status</label>
            <AppSelect
              v-model="form.status_id"
              :options="statuses.map((s: any) => ({ value: s.id, label: s.name }))"
              placeholder="Status"
            />
          </div>
        </div>
        <div>
          <label class="label">Subsystem</label>
          <AppSelect
            v-model="form.subsystem"
            :options="[{ value: '', label: '— Pilih subsystem —' }, ...SUBSYSTEMS.map(s => ({ value: s, label: s }))]"
            placeholder="— Pilih subsystem —"
          />
        </div>
        <div v-if="auth.isStaffOrAdmin"><label class="label">Assign ke</label>
          <AppSelect
            v-model="form.assigned_to"
            :options="[{ value: '', label: 'Pilih staff' }, ...staff.map((u: any) => ({ value: u.id, label: u.name }))]"
            placeholder="Pilih staff"
          />
        </div>
        <div><label class="label">Deskripsi</label><textarea v-model="form.description" class="input min-h-[100px] resize-none" placeholder="Jelaskan masalah secara detail..." /></div>

        <!-- Attachment upload -->
        <div>
          <label class="label">Lampiran</label>
          <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            <span class="text-xs text-slate-500">{{ uploading ? 'Mengupload...' : 'Pilih file (maks. 10MB)' }}</span>
            <input type="file" multiple class="hidden" :disabled="uploading" @change="handleFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
          </label>
          <div v-if="uploadedFiles.length" class="mt-2 flex flex-wrap gap-2">
            <div v-for="(f, i) in uploadedFiles" :key="i" class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span class="max-w-[120px] truncate">{{ f.original_name }}</span>
              <button type="button" @click="uploadedFiles.splice(i, 1)" class="text-slate-400 hover:text-red-500 ml-0.5">×</button>
            </div>
          </div>
          <p v-if="uploadError" class="text-xs text-red-600 mt-1">{{ uploadError }}</p>
        </div>

        <p v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="$emit('close')" class="btn-secondary">Batal</button>
          <button type="submit" class="btn-primary" :disabled="loading || uploading">{{ loading ? 'Menyimpan...' : 'Buat Ticket' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
<script setup lang="ts">
const SUBSYSTEMS = ['backbone', 'nvmee', 'pos', 'hris', 'wise', 'accounting', 'buzzbot', 'dementer', 'lainnya']

const props = defineProps<{
  taskId?: number | string
  taskTitle?: string
  projectId?: number | string
  prefillTitle?: string
}>()

const auth = useAuthStore()
const emit = defineEmits(['close', 'created'])
const { data: pd } = await useFetch('/api/priorities')
const { data: sd } = await useFetch('/api/statuses')
const { data: prd } = await useFetch('/api/projects')
const { data: ud } = await useFetch('/api/users')
const priorities = computed(() => (pd.value as any)?.data || [])
const statuses = computed(() => (sd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data?.filter((p: any) => p.is_active) || [])
const staff = computed(() => ((ud.value as any)?.data || []).filter((u: any) => ['staff','admin'].includes(u.role) && u.is_active))

const form = reactive({
  title: props.prefillTitle || '',
  description: '',
  project_id: props.projectId ? String(props.projectId) : '',
  priority_id: priorities.value[0]?.id || '',
  status_id: statuses.value[0]?.id || '',
  assigned_to: '',
  subsystem: '',
})
const taskId = computed(() => props.taskId)

const loading = ref(false)
const error = ref('')
const uploading = ref(false)
const uploadError = ref('')
const uploadedFiles = ref<Array<{ filename: string; original_name: string; mime_type: string; size: number }>>([])

async function handleFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  uploading.value = true
  uploadError.value = ''
  try {
    for (const file of Array.from(input.files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      uploadedFiles.value.push(res.data)
    }
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Gagal mengupload file'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function submit() {
  error.value = ''
  if (!form.project_id || !form.priority_id || !form.status_id) {
    error.value = 'Project, priority, dan status wajib diisi'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/tickets', {
      method: 'POST',
      body: {
        ...form,
        task_id: taskId.value || undefined,
        attachments: uploadedFiles.value,
      },
    })
    emit('created')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Gagal membuat ticket'
  } finally { loading.value = false }
}
</script>

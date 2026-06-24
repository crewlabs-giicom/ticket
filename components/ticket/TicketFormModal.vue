<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Buat Ticket Baru</h2>
          <p v-if="taskId" class="text-xs text-indigo-600 mt-0.5">Dari task: {{ props.taskTitle }}</p>
        </div>
        <button @click="$emit('close')" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
      <form @submit.prevent="submit" class="p-6 space-y-4">
        <div>
          <label class="label">Modul / Menu Sistem <span class="text-red-500">*</span></label>
          <AppSelect
            v-model="form.system_menu_id"
            :options="systemMenuOptions"
            placeholder="Pilih menu sistem..."
          />
          <p v-if="selectedMenu?.project_name" class="mt-1.5 flex items-center gap-1.5">
            <span class="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{{ selectedMenu.project_name }}</span>
          </p>
          <p v-else-if="form.system_menu_id && !selectedMenu?.project_id" class="mt-1 text-[11px] text-slate-400">Menu global — pilih project:</p>
        </div>
        <div v-if="form.system_menu_id && selectedMenu && !selectedMenu.project_id">
          <label class="label">Project <span class="text-red-500">*</span></label>
          <AppSelect
            v-model="form.project_id"
            :options="projects.map((p: any) => ({ value: p.id, label: p.name }))"
            placeholder="Pilih project"
          />
        </div>
        <div>
          <label class="label">Priority</label>
          <AppSelect
            v-model="form.priority_id"
            :options="priorities.map((p: any) => ({ value: p.id, label: p.name }))"
            placeholder="Priority"
          />
        </div>

        <div>
          <label class="label">Deskripsi</label>
          <textarea
            v-model="form.description"
            class="input min-h-[120px] resize-none"
            placeholder="Jelaskan masalah secara detail... (Ctrl+V untuk paste gambar)"
            @paste="handlePaste"
          />
          <p v-if="form.title" class="text-[11px] text-slate-400 mt-1">Judul: <span class="text-slate-600">{{ form.title }}</span></p>
        </div>

        <!-- Attachment upload -->
        <div>
          <label class="label">Lampiran</label>
          <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            <span class="text-xs text-slate-500">{{ uploading ? 'Mengupload...' : 'Pilih file atau paste gambar (maks. 10MB)' }}</span>
            <input type="file" multiple class="hidden" :disabled="uploading" @change="handleFiles" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv" />
          </label>
          <div v-if="uploadedFiles.length" class="mt-2 flex flex-wrap gap-2">
            <div v-for="(f, i) in uploadedFiles" :key="i">
              <template v-if="f.mime_type?.startsWith('image/')">
                <div class="flex flex-col items-center gap-0.5">
                  <img :src="`/uploads/${f.filename}`" :alt="f.original_name" class="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                  <button type="button" @click="uploadedFiles.splice(i, 1)" class="text-[10px] text-slate-400 hover:text-red-500 leading-none">✕</button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span class="max-w-[120px] truncate">{{ f.original_name }}</span>
                  <button type="button" @click="uploadedFiles.splice(i, 1)" class="text-slate-400 hover:text-red-500 ml-0.5">✕</button>
                </div>
              </template>
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
const props = defineProps<{
  taskId?: number | string
  taskTitle?: string
  projectId?: number | string
  prefillTitle?: string
  prefillDescription?: string
  prefillSystemMenuId?: number | string
}>()

const auth = useAuthStore()
const emit = defineEmits(['close', 'created'])
const { data: pd } = await useFetch('/api/priorities')
const { data: sd } = await useFetch('/api/statuses')
const { data: prd } = await useFetch('/api/projects')
const priorities = computed(() => (pd.value as any)?.data || [])
const statuses = computed(() => (sd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data?.filter((p: any) => p.is_active) || [])
const systemMenus = ref<any[]>([])

const systemMenuOptions = computed(() => {
  const opts: any[] = [{ value: '', label: '— Pilih menu sistem —' }]
  const byModule: Record<string, any[]> = {}
  for (const item of systemMenus.value) {
    if (!byModule[item.module]) byModule[item.module] = []
    byModule[item.module].push(item)
  }
  for (const [mod, items] of Object.entries(byModule)) {
    opts.push({ group: mod })
    for (const item of items) {
      const namePart = item.name ? ` › ${item.name}` : ''
      const typePart = item.type ? ` [${item.type.charAt(0).toUpperCase() + item.type.slice(1)}]` : ''
      const projPart = item.project_name ? ` · ${item.project_name}` : ''
      opts.push({ value: item.id, label: `${mod}${namePart}${typePart}${projPart}` })
    }
  }
  return opts
})

const selectedMenu = computed(() => systemMenus.value.find((m: any) => String(m.id) === String(form.system_menu_id)) ?? null)

const form = reactive({
  title: props.prefillTitle || '',
  description: props.prefillDescription || '',
  project_id: props.projectId ? String(props.projectId) : '',
  priority_id: priorities.value[0]?.id || '',
  status_id: statuses.value[0]?.id || '',
  subsystem: '',
  system_menu_id: props.prefillSystemMenuId ? String(props.prefillSystemMenuId) : '',
})
const taskId = computed(() => props.taskId)

// Auto-set project_id from selected menu's project
watch(selectedMenu, (menu) => {
  if (menu?.project_id) form.project_id = String(menu.project_id)
  else if (menu && !menu.project_id) form.project_id = ''
})

// Load all system menus on mount (filtered by role server-side)
const res = await $fetch<any>('/api/system-menus').catch(() => null)
systemMenus.value = res?.data || []

// If created from a task/project context, pre-select matching menu
if (props.projectId && !form.system_menu_id) {
  form.project_id = String(props.projectId)
}

watch(() => form.description, (val) => {
  if (props.prefillTitle) return
  const first = val.trim().split('\n')[0].slice(0, 80).trim()
  form.title = first || 'Tanpa judul'
})

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
      appendUploadContext(fd)
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

function appendUploadContext(fd: FormData) {
  fd.append('menu', 'ticket')
  const proj = projects.value.find((p: any) => String(p.id) === String(form.project_id))
  if (proj) {
    fd.append('project_id', String(proj.id))
    fd.append('project_name', proj.name || '')
  }
}

async function handlePaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItems = items.filter(item => item.type.startsWith('image/'))
  if (!imageItems.length) return
  e.preventDefault()
  uploading.value = true
  uploadError.value = ''
  try {
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (!file) continue
      const ext = item.type.split('/')[1] || 'png'
      const fd = new FormData()
      fd.append('file', file, `paste-${Date.now()}.${ext}`)
      appendUploadContext(fd)
      const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      uploadedFiles.value.push(res.data)
    }
  } catch {
    uploadError.value = 'Gagal mengupload gambar paste'
  } finally {
    uploading.value = false
  }
}

async function submit() {
  error.value = ''
  if (!form.system_menu_id) {
    error.value = 'Modul / menu sistem wajib dipilih'
    return
  }
  if (!form.project_id || !form.priority_id || !form.status_id) {
    error.value = 'Project dan priority wajib diisi'
    return
  }
  if (!form.description.trim()) {
    error.value = 'Deskripsi wajib diisi'
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

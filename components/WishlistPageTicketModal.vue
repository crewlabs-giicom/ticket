<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="store.closeTicketModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 bg-indigo-500">
        <div>
          <div class="text-white font-bold">Buat Tiket dari Catatan</div>
          <div class="text-indigo-200 text-xs mt-0.5">{{ sourceNote?.title }}</div>
        </div>
        <button @click="store.closeTicketModal()" class="text-indigo-200 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <!-- Selected items -->
        <div>
          <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Item yang dipilih</div>
          <div class="bg-yellow-50 rounded-xl p-3 border border-yellow-200 space-y-1.5">
            <div v-for="(item, idx) in selectedItems" :key="item.id" class="flex gap-2 text-sm text-gray-700">
              <span class="text-yellow-600 font-bold flex-shrink-0">{{ idx + 1 }}.</span>
              <span>{{ item.content }}</span>
            </div>
          </div>
        </div>

        <!-- Description editable -->
        <div>
          <label class="label text-sm mb-1.5">Deskripsi</label>
          <textarea
            v-model="form.description"
            rows="5"
            class="input w-full text-sm resize-none leading-relaxed"
            placeholder="Tambahkan keterangan..."
          />
        </div>

        <!-- System Menu -->
        <div>
          <label class="label text-sm mb-1.5">Modul / Menu Sistem <span class="text-red-400">*</span></label>
          <AppSelect v-model="form.system_menu_id" :options="systemMenuOptions" placeholder="— Pilih menu sistem —" />
        </div>

        <!-- Project (if menu has no project) -->
        <div v-if="selectedMenu && !selectedMenu.project_id">
          <label class="label text-sm mb-1.5">Project <span class="text-red-400">*</span></label>
          <AppSelect
            v-model="form.project_id"
            :options="[{ value: '', label: '— Pilih project —' }, ...projects.map((p: any) => ({ value: p.id, label: p.name }))]"
            placeholder="— Pilih project —"
          />
        </div>

        <!-- Priority -->
        <div>
          <label class="label text-sm mb-1.5">Priority <span class="text-red-400">*</span></label>
          <AppSelect
            v-model="form.priority_id"
            :options="priorities.map((p: any) => ({ value: p.id, label: `${p.name}  —  SLA ${formatSla(p.sla_hours)}` }))"
            placeholder="— Pilih priority —"
          />
        </div>

        <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{{ error }}</div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-gray-100 flex gap-3">
        <button
          @click="store.closeTicketModal()"
          class="flex-1 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl transition-colors"
        >Batal</button>
        <button
          @click="submit"
          :disabled="submitting"
          class="flex-1 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ submitting ? 'Membuat...' : 'Buat Tiket' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const store = useWishlistStore()
const notif = useNotifStore()

const { data: pd } = await useFetch('/api/priorities')
const { data: sd } = await useFetch('/api/statuses')
const { data: prd } = await useFetch('/api/projects')
const priorities = computed(() => (pd.value as any)?.data || [])
const statuses = computed(() => (sd.value as any)?.data || [])
const projects = computed(() => (prd.value as any)?.data?.filter((p: any) => p.is_active) || [])

const systemMenus = ref<any[]>([])
const submitting = ref(false)
const error = ref('')

const form = reactive({
  description: '',
  system_menu_id: '' as string | number,
  priority_id: '' as string | number,
  project_id: '' as string | number,
})

const sourceNote = computed(() =>
  store.notes.find(n => n.id === store.ticketSourceNoteId) ?? null
)

const selectedItems = computed(() => {
  const items = sourceNote.value?.items || []
  return items
    .filter(i => store.selectedItemIds.has(i.id))
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
})

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

const selectedMenu = computed(() =>
  systemMenus.value.find((m: any) => String(m.id) === String(form.system_menu_id)) ?? null
)

watch(selectedMenu, (menu) => {
  if (menu?.project_id) form.project_id = String(menu.project_id)
  else if (menu && !menu.project_id) form.project_id = ''
})

function formatSla(hours: number) {
  if (hours < 24) return `${hours} jam`
  const days = hours / 24
  return days === 1 ? '1 hari' : `${days} hari`
}

async function submit() {
  error.value = ''
  if (!form.system_menu_id) { error.value = 'Modul wajib dipilih'; return }
  if (!form.priority_id) { error.value = 'Priority wajib dipilih'; return }
  const projectId = selectedMenu.value?.project_id || form.project_id
  if (!projectId) { error.value = 'Project wajib diisi'; return }

  const noteTitle = sourceNote.value?.title || 'Catatan'
  const description = form.description

  submitting.value = true
  try {
    await $fetch('/api/tickets', {
      method: 'POST',
      body: {
        title: noteTitle,
        description,
        system_menu_id: form.system_menu_id,
        priority_id: form.priority_id,
        project_id: projectId,
        status_id: statuses.value[0]?.id,
      },
    })
    store.closeTicketModal()
    notif.addToast({ title: 'Tiket berhasil dibuat', message: `"${noteTitle}" → tiket baru`, type: 'success' })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Gagal membuat tiket'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  form.description = selectedItems.value
    .map((item, idx) => `${idx + 1}. ${item.content}`)
    .join('\n')
  const res = await $fetch<any>('/api/system-menus').catch(() => null)
  systemMenus.value = res?.data || []
  if (priorities.value.length) form.priority_id = priorities.value[0].id
})
</script>

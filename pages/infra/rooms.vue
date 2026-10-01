<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-sm text-slate-500">{{ t('infra.rooms.subtitle') }}</p>
      <div class="flex items-center gap-2">
        <AppRefreshButton :loading="pending" @click="refreshAll()" />
        <button v-if="auth.isAdmin" @click="openRoomForm()" class="btn-primary">+ {{ t('infra.rooms.addRoom') }}</button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Room list -->
      <div class="card overflow-hidden lg:col-span-1">
        <div v-if="!rooms.length" class="p-6 text-center text-sm text-slate-400">{{ t('infra.rooms.noRooms') }}</div>
        <ul class="divide-y divide-slate-100">
          <li
            v-for="r in rooms" :key="r.id" @click="selectedId = r.id"
            :class="['px-4 py-3 cursor-pointer hover:bg-slate-50', selectedId === r.id && 'bg-primary-50']"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-slate-900">{{ r.name }}</span>
              <span v-if="!r.is_active" class="badge bg-slate-100 text-slate-500">{{ t('infra.common.inactive') }}</span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              <span v-if="r.location">{{ r.location }} · </span>{{ r.device_count }} {{ t('infra.rooms.devices') }} · {{ r.pc_count }} PC
            </div>
          </li>
        </ul>
      </div>

      <!-- Room detail -->
      <div class="lg:col-span-2 space-y-4">
        <div v-if="!selected" class="card p-8 text-center text-sm text-slate-400">{{ t('infra.rooms.selectRoom') }}</div>
        <template v-else>
          <div class="card p-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-slate-900">{{ selected.name }}</h3>
              <p class="text-xs text-slate-500">{{ selected.location || '—' }}</p>
              <p v-if="selected.description" class="text-sm text-slate-600 mt-1">{{ selected.description }}</p>
            </div>
            <div v-if="auth.isAdmin" class="flex gap-1 flex-shrink-0">
              <button @click="openRoomForm(selected)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
              <button @click="deleteRoom(selected)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button>
            </div>
          </div>

          <!-- Devices -->
          <div class="card overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h4 class="text-sm font-semibold text-slate-900">{{ t('infra.rooms.devices') }}</h4>
              <button v-if="auth.isAdmin" @click="openDeviceForm()" class="btn-secondary py-1 px-2 text-xs">+ {{ t('infra.rooms.addDevice') }}</button>
            </div>
            <div v-if="!roomDevices.length" class="p-4 text-sm text-slate-400 text-center">—</div>
            <div v-for="d in roomDevices" :key="d.id" class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
              <span class="badge bg-indigo-50 text-indigo-600 uppercase">{{ t(`infra.rooms.types.${d.type}`) }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 truncate">{{ d.name }} <span v-if="!d.is_active" class="text-xs text-slate-400">({{ t('infra.common.inactive') }})</span></div>
                <div class="text-xs text-slate-400 truncate">{{ [d.brand_model, d.ip_address, d.mac_address].filter(Boolean).join(' · ') || '—' }}</div>
              </div>
              <template v-if="auth.isAdmin">
                <button @click="openDeviceForm(d)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
                <button @click="deleteItem('devices', d)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button>
              </template>
            </div>
          </div>

          <!-- PCs -->
          <div class="card overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h4 class="text-sm font-semibold text-slate-900">PC</h4>
              <button v-if="auth.isAdmin" @click="openPcForm()" class="btn-secondary py-1 px-2 text-xs">+ {{ t('infra.rooms.addPc') }}</button>
            </div>
            <div v-if="!roomPcs.length" class="p-4 text-sm text-slate-400 text-center">—</div>
            <div v-for="p in roomPcs" :key="p.id" class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 truncate">{{ p.name }} <span v-if="!p.is_active" class="text-xs text-slate-400">({{ t('infra.common.inactive') }})</span></div>
                <div v-if="p.description" class="text-xs text-slate-400 truncate">{{ p.description }}</div>
              </div>
              <template v-if="auth.isAdmin">
                <button @click="openPcForm(p)" class="btn-ghost py-1 px-2 text-xs">{{ t('common.edit') }}</button>
                <button @click="deleteItem('pcs', p)" class="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50">{{ t('common.delete') }}</button>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Room modal -->
    <div v-if="modal === 'room'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('infra.rooms.editRoom') : t('infra.rooms.addRoom') }}</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('infra.rooms.name') }}</label><input v-model="roomForm.name" class="input" /></div>
          <div><label class="label">{{ t('infra.rooms.location') }}</label><input v-model="roomForm.location" class="input" :placeholder="t('infra.rooms.locationHint')" /></div>
          <div><label class="label">{{ t('infra.rooms.description') }}</label><textarea v-model="roomForm.description" rows="2" class="input" /></div>
          <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="roomForm.is_active" /> {{ t('infra.common.active') }}</label>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="saveRoom" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Device modal -->
    <div v-if="modal === 'device'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('infra.rooms.editDevice') : t('infra.rooms.addDevice') }}</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('infra.rooms.name') }}</label><input v-model="deviceForm.name" class="input" placeholder="AP-Lantai2-A" /></div>
          <div>
            <label class="label">{{ t('infra.rooms.deviceType') }}</label>
            <AppSelect v-model="deviceForm.type" :options="deviceTypeOptions" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">IP</label><input v-model="deviceForm.ip_address" class="input" placeholder="192.168.1.10" /></div>
            <div><label class="label">MAC</label><input v-model="deviceForm.mac_address" class="input" /></div>
          </div>
          <div><label class="label">{{ t('infra.rooms.brandModel') }}</label><input v-model="deviceForm.brand_model" class="input" /></div>
          <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="deviceForm.is_active" /> {{ t('infra.common.active') }}</label>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="saveDevice" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- PC modal -->
    <div v-if="modal === 'pc'" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-base font-semibold text-slate-900 mb-4">{{ editing ? t('infra.rooms.editPc') : t('infra.rooms.addPc') }}</h3>
        <div class="space-y-4">
          <div><label class="label">{{ t('infra.rooms.pcName') }}</label><input v-model="pcForm.name" class="input" placeholder="PC-01" /></div>
          <div><label class="label">{{ t('infra.rooms.description') }}</label><input v-model="pcForm.description" class="input" /></div>
          <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" v-model="pcForm.is_active" /> {{ t('infra.common.active') }}</label>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeModal" class="btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="savePc" class="btn-primary flex-1">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()
const { confirmDelete, toast } = useConfirm()

if (auth.user?.role === 'customer') await navigateTo('/')

const { data: roomsRes, refresh: refreshRooms, pending } = await useFetch<any>('/api/rooms')
const { data: devicesRes, refresh: refreshDevices } = await useFetch<any>('/api/devices')
const { data: pcsRes, refresh: refreshPcs } = await useFetch<any>('/api/pcs')

const rooms = computed<any[]>(() => roomsRes.value?.data || [])
const selectedId = ref<number | null>(null)
watch(rooms, (list) => {
  if (!list.length) selectedId.value = null
  else if (!list.some(r => r.id === selectedId.value)) selectedId.value = list[0].id
}, { immediate: true })
const selected = computed(() => rooms.value.find(r => r.id === selectedId.value) || null)
const roomDevices = computed<any[]>(() => (devicesRes.value?.data || []).filter((d: any) => d.room_id === selectedId.value))
const roomPcs = computed<any[]>(() => (pcsRes.value?.data || []).filter((p: any) => p.room_id === selectedId.value))

async function refreshAll() { await Promise.all([refreshRooms(), refreshDevices(), refreshPcs()]) }

const modal = ref<'room' | 'device' | 'pc' | null>(null)
const editing = ref<any>(null)
function closeModal() { modal.value = null; editing.value = null }

const roomForm = reactive({ name: '', location: '', description: '', is_active: true })
const deviceForm = reactive({ name: '', type: 'ap', ip_address: '', mac_address: '', brand_model: '', is_active: true })
const pcForm = reactive({ name: '', description: '', is_active: true })
const deviceTypeOptions = computed(() => ['ap', 'switch', 'router', 'other'].map(v => ({ value: v, label: t(`infra.rooms.types.${v}`) })))

function openRoomForm(r?: any) {
  editing.value = r || null
  Object.assign(roomForm, r ? { name: r.name, location: r.location || '', description: r.description || '', is_active: !!r.is_active } : { name: '', location: '', description: '', is_active: true })
  modal.value = 'room'
}
function openDeviceForm(d?: any) {
  editing.value = d || null
  Object.assign(deviceForm, d ? { name: d.name, type: d.type, ip_address: d.ip_address || '', mac_address: d.mac_address || '', brand_model: d.brand_model || '', is_active: !!d.is_active } : { name: '', type: 'ap', ip_address: '', mac_address: '', brand_model: '', is_active: true })
  modal.value = 'device'
}
function openPcForm(p?: any) {
  editing.value = p || null
  Object.assign(pcForm, p ? { name: p.name, description: p.description || '', is_active: !!p.is_active } : { name: '', description: '', is_active: true })
  modal.value = 'pc'
}

async function submit(fn: () => Promise<any>) {
  try { await fn(); toast(t('infra.common.saved')) }
  catch (e: any) { toast(e?.data?.statusMessage || t('common.error'), 'error') }
}

async function saveRoom() {
  await submit(async () => {
    const body = { ...roomForm, is_active: roomForm.is_active ? 1 : 0 }
    if (editing.value) await $fetch(`/api/rooms/${editing.value.id}`, { method: 'PUT', body })
    else {
      const res: any = await $fetch('/api/rooms', { method: 'POST', body })
      selectedId.value = res.data.id
    }
    closeModal(); await refreshRooms()
  })
}
async function saveDevice() {
  await submit(async () => {
    const body = { ...deviceForm, room_id: selectedId.value, is_active: deviceForm.is_active ? 1 : 0 }
    if (editing.value) await $fetch(`/api/devices/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/devices', { method: 'POST', body })
    closeModal(); await Promise.all([refreshDevices(), refreshRooms()])
  })
}
async function savePc() {
  await submit(async () => {
    const body = { ...pcForm, room_id: selectedId.value, is_active: pcForm.is_active ? 1 : 0 }
    if (editing.value) await $fetch(`/api/pcs/${editing.value.id}`, { method: 'PUT', body })
    else await $fetch('/api/pcs', { method: 'POST', body })
    closeModal(); await Promise.all([refreshPcs(), refreshRooms()])
  })
}

async function deleteRoom(r: any) {
  if (!await confirmDelete(t('infra.rooms.deleteRoomText'), t('infra.rooms.deleteRoomTitle'))) return
  await $fetch(`/api/rooms/${r.id}`, { method: 'DELETE' })
  await refreshAll()
}
async function deleteItem(kind: 'devices' | 'pcs', item: any) {
  if (!await confirmDelete(undefined, t('infra.common.deleteTitle'))) return
  await $fetch(`/api/${kind}/${item.id}`, { method: 'DELETE' })
  await Promise.all([kind === 'devices' ? refreshDevices() : refreshPcs(), refreshRooms()])
}
</script>

import { useOfflineDb } from './useOfflineDb'

let _syncing = false
let _listenersSetup = false

export function useSync() {
  const pendingCount = useState<number>('sync_pending_count', () => 0)
  const isSyncing = useState<boolean>('sync_is_syncing', () => false)

  async function refreshPendingCount() {
    if (!import.meta.client) return
    const db = useOfflineDb()
    pendingCount.value = await db.sync_queue.where('status').equals('pending').count()
  }

  async function syncQueue() {
    if (_syncing) return
    if (!navigator.onLine) return

    const db = useOfflineDb()
    const items = await db.sync_queue
      .where('status').equals('pending')
      .sortBy('createdAt')

    if (!items.length) return

    _syncing = true
    isSyncing.value = true

    for (const item of items) {
      await db.sync_queue.update(item.localId!, { status: 'syncing' })
      try {
        let url = ''
        let method = 'POST'

        if (item.entityType === 'task') {
          if (item.action === 'create') { url = '/api/tasks'; method = 'POST' }
          else if (item.action === 'update') { url = `/api/tasks/${item.entityId}`; method = 'PUT' }
          else if (item.action === 'delete') { url = `/api/tasks/${item.entityId}`; method = 'DELETE' }
        } else if (item.entityType === 'ticket') {
          if (item.action === 'create') { url = '/api/tickets'; method = 'POST' }
          else if (item.action === 'update') { url = `/api/tickets/${item.entityId}`; method = 'PUT' }
        } else if (item.entityType === 'ticket_link') {
          url = '/api/ticket-links'; method = 'POST'
        }

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'DELETE' ? JSON.stringify(item.payload) : undefined,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = method !== 'DELETE' ? await res.json() : null

        // Replace tempId references in local DB
        if (item.action === 'create' && data?.id && String(item.entityId).startsWith('tmp_')) {
          const realId = data.id
          const tmpId = item.entityId

          if (item.entityType === 'task') {
            const local = await db.tasks.get(tmpId as string)
            if (local) {
              await db.tasks.delete(tmpId as string)
              await db.tasks.put({ ...local, id: realId, _tempId: false })
            }
            // Fix tickets referencing this tempId
            const linkedTickets = await db.tickets.where('task_id').equals(tmpId).toArray()
            for (const t of linkedTickets) {
              await db.tickets.update(t.id as any, { task_id: realId })
            }
          } else if (item.entityType === 'ticket') {
            const local = await db.tickets.get(tmpId as string)
            if (local) {
              await db.tickets.delete(tmpId as string)
              await db.tickets.put({ ...local, id: realId, ticket_number: data.ticket_number, _tempId: false })
            }
          }
        }

        await db.sync_queue.update(item.localId!, { status: 'synced' })
      } catch {
        await db.sync_queue.update(item.localId!, { status: 'pending' })
      }
    }

    _syncing = false
    isSyncing.value = false
    await refreshPendingCount()
  }

  function setupListeners() {
    if (!import.meta.client) return
    if (_listenersSetup) return
    _listenersSetup = true
    window.addEventListener('online', () => syncQueue())
    setInterval(() => syncQueue(), 30_000)
    refreshPendingCount()
  }

  async function retrySync() {
    await syncQueue()
    await refreshPendingCount()
  }

  async function clearQueue() {
    if (!import.meta.client) return
    const db = useOfflineDb()
    await db.sync_queue.where('status').anyOf(['pending', 'syncing']).delete()
    await refreshPendingCount()
  }

  return { pendingCount, isSyncing, syncQueue, retrySync, clearQueue, refreshPendingCount, setupListeners }
}

export async function performAction(
  entityType: 'task' | 'ticket' | 'ticket_link' | 'project_member',
  action: 'create' | 'update' | 'delete',
  entityId: string | number,
  payload: Record<string, any>,
  localMutation?: () => Promise<void>
) {
  if (!import.meta.client) return

  const db = useOfflineDb()

  // Optimistic local update
  if (localMutation) await localMutation()

  // Queue for server sync
  await db.sync_queue.add({
    entityType,
    entityId,
    action,
    payload,
    status: 'pending',
    createdAt: Date.now(),
  })

  const { syncQueue, refreshPendingCount } = useSync()
  await refreshPendingCount()

  // Try to sync immediately if online
  if (navigator.onLine) {
    await syncQueue()
  }
}

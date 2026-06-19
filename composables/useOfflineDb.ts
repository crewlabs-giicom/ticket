import Dexie, { type Table } from 'dexie'

export interface LocalProject {
  id: number
  name: string
  description?: string
  is_active: number
  updated_at: string
}

export interface LocalTask {
  id: number | string  // string = tempId when created offline
  project_id: number
  title: string
  description?: string
  status: string
  position: number
  assigned_to?: number
  due_date?: string
  updated_at: string
  _tempId?: boolean
}

export interface LocalTicket {
  id: number | string
  ticket_number?: string
  title: string
  project_id: number
  task_id?: number | string
  status_id?: number
  priority_id?: number
  updated_at: string
  _tempId?: boolean
}

export interface SyncQueueItem {
  localId?: number
  entityType: 'task' | 'ticket' | 'ticket_link' | 'project_member'
  entityId: string | number
  action: 'create' | 'update' | 'delete'
  payload: Record<string, any>
  status: 'pending' | 'syncing' | 'synced' | 'conflict'
  createdAt: number
}

class OfflineDb extends Dexie {
  projects!: Table<LocalProject>
  tasks!: Table<LocalTask>
  tickets!: Table<LocalTicket>
  sync_queue!: Table<SyncQueueItem>

  constructor() {
    super('ticketing_offline')
    this.version(1).stores({
      projects: 'id, updated_at',
      tasks: 'id, project_id, status, updated_at',
      tickets: 'id, project_id, task_id, status_id, updated_at',
      sync_queue: '++localId, entityType, entityId, status, createdAt',
    })
  }
}

let _db: OfflineDb | null = null

export function useOfflineDb(): OfflineDb {
  if (!_db) _db = new OfflineDb()
  return _db
}

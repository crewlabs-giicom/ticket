import type mysql from 'mysql2/promise'

interface LogActivityParams {
  entity_type: 'ticket' | 'task'
  entity_id: number
  action: string
  from_value?: string | null
  to_value?: string | null
  label: string
  user_id?: number | null
}

export async function logActivity(db: mysql.Pool, params: LogActivityParams) {
  await db.execute(
    'INSERT INTO activity_logs (entity_type, entity_id, action, from_value, to_value, label, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [params.entity_type, params.entity_id, params.action, params.from_value ?? null, params.to_value ?? null, params.label, params.user_id ?? null]
  )
}

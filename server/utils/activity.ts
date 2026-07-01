import type mysql from 'mysql2/promise'

interface LogActivityParams {
  entity_type: 'ticket' | 'task' | 'request' | 'prd' | 'qc_form'
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

/**
 * activity_logs and due_date_revisions key off (entity_type, entity_id) polymorphically —
 * there's no real FK, so deleting a ticket/task/prd/qc_form never cascades into them.
 * Call this before/after deleting an entity so its history doesn't linger as orphaned rows.
 */
export async function deletePolymorphicHistory(
  db: mysql.Pool,
  entityType: 'ticket' | 'task' | 'request' | 'prd' | 'qc_form',
  entityIds: number[]
) {
  if (!entityIds.length) return
  const placeholders = entityIds.map(() => '?').join(',')
  await db.execute(
    `DELETE FROM activity_logs WHERE entity_type = ? AND entity_id IN (${placeholders})`,
    [entityType, ...entityIds]
  )
  await db.execute(
    `DELETE FROM due_date_revisions WHERE entity_type = ? AND entity_id IN (${placeholders})`,
    [entityType, ...entityIds]
  ).catch(() => {}) // due_date_revisions only tracks 'prd' | 'task' | 'qc_form'
}

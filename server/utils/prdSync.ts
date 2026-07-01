import type { Pool } from 'mysql2/promise'
import { logActivity } from './activity'

const PRD_TO_REQUEST_STATUS: Record<string, string> = {
  draft: 'under_review',
  in_review: 'under_review',
  approved: 'approved',
  in_progress: 'in_progress',
  done: 'done',
}

export async function syncRequestStatusFromPRD(db: Pool, prdId: number, newPrdStatus: string, userId?: number | null) {
  const mapped = PRD_TO_REQUEST_STATUS[newPrdStatus]
  if (!mapped) return

  const [rows] = await db.execute(
    `SELECT id, status FROM requests WHERE prd_id = ?`,
    [prdId]
  ) as any[]

  for (const req of rows as any[]) {
    if (req.status === 'rejected' || req.status === 'standalone') continue
    if (req.status === mapped) continue
    await db.execute(`UPDATE requests SET status = ? WHERE id = ?`, [mapped, req.id])
    await logActivity(db, {
      entity_type: 'request', entity_id: req.id,
      action: 'status_changed',
      from_value: req.status, to_value: mapped,
      label: `Status request disinkronkan mengikuti PRD (${newPrdStatus})`,
      user_id: userId ?? null,
    })
  }
}

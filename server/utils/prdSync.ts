import type { Pool } from 'mysql2/promise'

const PRD_TO_REQUEST_STATUS: Record<string, string> = {
  draft: 'under_review',
  in_review: 'under_review',
  approved: 'approved',
  in_progress: 'in_progress',
  done: 'done',
}

export async function syncRequestStatusFromPRD(db: Pool, prdId: number, newPrdStatus: string) {
  const mapped = PRD_TO_REQUEST_STATUS[newPrdStatus]
  if (!mapped) return

  const [rows] = await db.execute(
    `SELECT id, status FROM requests WHERE prd_id = ?`,
    [prdId]
  ) as any[]

  for (const req of rows as any[]) {
    if (req.status === 'rejected' || req.status === 'standalone') continue
    await db.execute(`UPDATE requests SET status = ? WHERE id = ?`, [mapped, req.id])
  }
}

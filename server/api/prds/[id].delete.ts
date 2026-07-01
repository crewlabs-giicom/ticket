import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'
import { deletePolymorphicHistory, logActivity } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[prd]] = await db.execute('SELECT id, title FROM prds WHERE id = ?', [id]) as any[]
  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  // Requests linked to this PRD would otherwise be left with a stale status (e.g. "approved")
  // pointing at a PRD that no longer exists. Bounce them back to under_review instead —
  // unless they were already rejected/standalone, which stay untouched.
  const [linkedRequests] = await db.execute(
    `SELECT id, status FROM requests WHERE prd_id = ? AND status NOT IN ('rejected', 'standalone')`,
    [id]
  ) as any[]
  for (const req of linkedRequests as any[]) {
    await db.execute(`UPDATE requests SET prd_id = NULL, status = 'under_review' WHERE id = ?`, [req.id])
    await logActivity(db, {
      entity_type: 'request', entity_id: req.id,
      action: 'status_changed',
      from_value: req.status, to_value: 'under_review',
      label: `PRD "${prd.title}" dihapus oleh ${user.name}, request dikembalikan ke under review`,
      user_id: user.id,
    })
  }

  // Tasks (and their own QC forms) linked to this PRD are unlinked via ON DELETE SET NULL,
  // not deleted — deleting a PRD shouldn't destroy the work tracked under it.
  await deletePolymorphicHistory(db, 'prd', [id])
  // prd_versions and prd_milestones cascade-delete via FK.
  await db.execute('DELETE FROM prds WHERE id = ?', [id])

  return { success: true }
})

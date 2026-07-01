import { getDb } from '../database/index'
import { requireAuth } from '../utils/rbac'

const VALID_ENTITY_TYPES = ['prd', 'task', 'qc_form']

// Resolves the project_id that owns a given entity, so access can be scoped to project members.
async function getEntityProjectId(db: any, entityType: string, entityId: number): Promise<number | null> {
  if (entityType === 'prd') {
    const [[row]] = await db.execute('SELECT project_id FROM prds WHERE id = ?', [entityId]) as any[]
    return row?.project_id ?? null
  }
  if (entityType === 'task') {
    const [[row]] = await db.execute('SELECT project_id FROM tasks WHERE id = ?', [entityId]) as any[]
    return row?.project_id ?? null
  }
  if (entityType === 'qc_form') {
    const [[row]] = await db.execute(
      `SELECT t.project_id FROM qc_forms qf JOIN tasks t ON t.id = qf.task_id WHERE qf.id = ?`, [entityId]
    ) as any[]
    return row?.project_id ?? null
  }
  return null
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const query = getQuery(event)
  const { entity_type, entity_id } = query

  if (!entity_type || !entity_id) throw createError({ statusCode: 400, statusMessage: 'entity_type and entity_id required' })
  if (!VALID_ENTITY_TYPES.includes(String(entity_type))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid entity_type' })
  }

  if (user.role !== 'admin') {
    const projectId = await getEntityProjectId(db, String(entity_type), Number(entity_id))
    if (!projectId) throw createError({ statusCode: 404, statusMessage: 'Entity not found' })
    const [[isMember]] = await db.execute(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, user.id]
    ) as any[]
    if (!isMember) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const [rows] = await db.execute(
    `SELECT r.*, u.name as revised_by_name
     FROM due_date_revisions r
     LEFT JOIN users u ON u.id = r.revised_by
     WHERE r.entity_type = ? AND r.entity_id = ?
     ORDER BY r.revised_at DESC`,
    [String(entity_type), Number(entity_id)]
  )

  return rows
})

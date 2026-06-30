import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const q = getQuery(event)

  const conditions: string[] = []
  const params: any[] = []

  if (q.project_id) { conditions.push('p.project_id = ?'); params.push(Number(q.project_id)) }
  if (q.status) { conditions.push('p.status = ?'); params.push(q.status) }
  if (q.search) { conditions.push('p.title LIKE ?'); params.push(`%${q.search}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(Number(q.limit) || 50, 500)
  const page = Math.max(Number(q.page) || 1, 1)
  const offset = (page - 1) * limit

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM prds p ${where}`, params
  ) as any[]

  const [rows] = await db.execute(
    `SELECT p.*, pr.name as project_name,
            u.name as created_by_name,
            pv.version_number as current_version_number,
            (SELECT COUNT(*) FROM requests r WHERE r.prd_id = p.id) as request_count
     FROM prds p
     LEFT JOIN projects pr ON pr.id = p.project_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN prd_versions pv ON pv.id = p.current_version_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
})

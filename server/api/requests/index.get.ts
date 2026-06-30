import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const q = getQuery(event)

  const conditions: string[] = []
  const params: any[] = []

  if (q.status) { conditions.push('r.status = ?'); params.push(q.status) }
  if (q.project_id) { conditions.push('r.project_id = ?'); params.push(Number(q.project_id)) }
  if (q.requester_id) { conditions.push('r.requester_id = ?'); params.push(Number(q.requester_id)) }
  if (q.prd_id) { conditions.push('r.prd_id = ?'); params.push(Number(q.prd_id)) }
  if (q.unassigned === '1') conditions.push('r.prd_id IS NULL')
  if (q.search) { conditions.push('r.title LIKE ?'); params.push(`%${q.search}%`) }

  // Customer can only see their own requests
  if (user.role === 'customer') {
    conditions.push('r.requester_id = ?')
    params.push(user.id)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(Number(q.limit) || 50, 500)
  const page = Math.max(Number(q.page) || 1, 1)
  const offset = (page - 1) * limit

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) as total FROM requests r ${where}`, params
  ) as any[]

  const [rows] = await db.execute(
    `SELECT r.*, u.name as requester_name, p.name as project_name,
            prd.title as prd_title
     FROM requests r
     LEFT JOIN users u ON u.id = r.requester_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN prds prd ON prd.id = r.prd_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
})

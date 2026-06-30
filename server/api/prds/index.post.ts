import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const body = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!body.project_id) throw createError({ statusCode: 400, statusMessage: 'project_id is required' })

  const conn = await (db as any).getConnection()
  try {
    await conn.beginTransaction()

    const [prdResult] = await conn.execute(
      `INSERT INTO prds (title, project_id, status, created_by) VALUES (?, ?, 'draft', ?)`,
      [body.title.trim(), Number(body.project_id), user.id]
    )
    const prdId = prdResult.insertId

    const [verResult] = await conn.execute(
      `INSERT INTO prd_versions (prd_id, version_number, background, goals, scope_in, scope_out, requirements, technical_approach, changelog, created_by)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, '', ?)`,
      [prdId, body.background || null, body.goals || null, body.scope_in || null, body.scope_out || null, body.requirements || null, body.technical_approach || null, user.id]
    )
    const versionId = verResult.insertId

    await conn.execute(`UPDATE prds SET current_version_id = ? WHERE id = ?`, [versionId, prdId])
    await conn.commit()

    const [[row]] = await conn.execute(
      `SELECT p.*, pr.name as project_name, u.name as created_by_name
       FROM prds p
       LEFT JOIN projects pr ON pr.id = p.project_id
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = ?`,
      [prdId]
    ) as any[]

    return row
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const [[prd]] = await db.execute(
    `SELECT p.*, pv.background, pv.goals, pv.scope_in, pv.scope_out, pv.requirements, pv.technical_approach
     FROM prds p
     LEFT JOIN prd_versions pv ON pv.id = p.current_version_id
     WHERE p.id = ?`,
    [id]
  ) as any[]

  if (!prd) throw createError({ statusCode: 404, statusMessage: 'PRD not found' })

  const [[{ maxVer }]] = await db.execute(
    `SELECT MAX(version_number) as maxVer FROM prd_versions WHERE prd_id = ?`, [id]
  ) as any[]

  const nextVersion = (maxVer || 0) + 1

  const conn = await (db as any).getConnection()
  try {
    await conn.beginTransaction()

    const [verResult] = await conn.execute(
      `INSERT INTO prd_versions (prd_id, version_number, background, goals, scope_in, scope_out, requirements, technical_approach, changelog, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, nextVersion,
        body.background ?? prd.background,
        body.goals ?? prd.goals,
        body.scope_in ?? prd.scope_in,
        body.scope_out ?? prd.scope_out,
        body.requirements ?? prd.requirements,
        body.technical_approach ?? prd.technical_approach,
        body.changelog || null,
        user.id
      ]
    )
    const versionId = verResult.insertId

    await conn.execute(`UPDATE prds SET current_version_id = ? WHERE id = ?`, [versionId, id])
    await conn.commit()

    const [[row]] = await conn.execute(
      `SELECT pv.*, u.name as created_by_name FROM prd_versions pv LEFT JOIN users u ON u.id = pv.created_by WHERE pv.id = ?`,
      [versionId]
    ) as any[]

    return row
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
})

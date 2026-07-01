import { getDb } from '../../database/index'
import { requireAuth, requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  if (event.method === 'GET') {
    requireAuth(event)
    const [rows] = await db.execute(
      `SELECT qt.*, u.name as created_by_name
       FROM qc_templates qt
       JOIN users u ON u.id = qt.created_by
       WHERE qt.id = ?`,
      [id]
    )
    const row = (rows as any[])[0]
    if (!row) throw createError({ statusCode: 404, message: 'Not found' })
    return row
  }

  if (event.method === 'PUT') {
    requireRole(event, ['admin', 'staff'])
    const { name, description } = await readBody(event)
    if (!name?.trim()) throw createError({ statusCode: 400, message: 'name required' })
    await db.execute(
      'UPDATE qc_templates SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description || null, id]
    )
    const [rows] = await db.execute('SELECT * FROM qc_templates WHERE id = ?', [id])
    return (rows as any[])[0]
  }

  if (event.method === 'DELETE') {
    requireRole(event, ['admin', 'staff'])
    await db.execute('DELETE FROM qc_templates WHERE id = ?', [id])
    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

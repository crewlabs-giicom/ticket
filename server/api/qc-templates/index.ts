import { getDb } from '../../database/index'
import { requireRole, requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const db = getDb()

  if (event.method === 'GET') {
    requireAuth(event)
    const [rows] = await db.execute(
      `SELECT qt.*, u.name as created_by_name
       FROM qc_templates qt
       JOIN users u ON u.id = qt.created_by
       ORDER BY qt.name ASC`
    )
    return rows
  }

  if (event.method === 'POST') {
    const user = requireRole(event, ['admin', 'staff'])
    const { name, description } = await readBody(event)
    if (!name?.trim()) throw createError({ statusCode: 400, message: 'name required' })

    const [result] = await db.execute(
      'INSERT INTO qc_templates (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description || null, user.id]
    ) as any[]
    const [rows] = await db.execute('SELECT * FROM qc_templates WHERE id = ?', [result.insertId])
    return (rows as any[])[0]
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

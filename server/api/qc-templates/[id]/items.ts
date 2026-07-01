import { getDb } from '../../../database/index'
import { requireAuth, requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const templateId = Number(getRouterParam(event, 'id'))

  if (event.method === 'GET') {
    requireAuth(event)
    const [rows] = await db.execute(
      'SELECT * FROM qc_template_items WHERE qc_template_id = ? ORDER BY order_index ASC, id ASC',
      [templateId]
    )
    return rows
  }

  if (event.method === 'POST') {
    requireRole(event, ['admin', 'staff'])
    const { item_name } = await readBody(event)
    if (!item_name?.trim()) throw createError({ statusCode: 400, message: 'item_name required' })
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as c FROM qc_template_items WHERE qc_template_id = ?', [templateId]
    ) as any[]
    const orderIndex = (countRows[0]?.c ?? 0)
    const [result] = await db.execute(
      'INSERT INTO qc_template_items (qc_template_id, item_name, order_index) VALUES (?, ?, ?)',
      [templateId, item_name.trim(), orderIndex]
    ) as any[]
    const [rows] = await db.execute('SELECT * FROM qc_template_items WHERE id = ?', [result.insertId])
    return (rows as any[])[0]
  }

  if (event.method === 'PUT') {
    // Replace all items for this template
    requireRole(event, ['admin', 'staff'])
    const { items } = await readBody(event) as { items: string[] }
    if (!Array.isArray(items)) throw createError({ statusCode: 400, message: 'items array required' })
    await db.execute('DELETE FROM qc_template_items WHERE qc_template_id = ?', [templateId])
    for (let i = 0; i < items.length; i++) {
      const name = String(items[i]).trim()
      if (name) await db.execute(
        'INSERT INTO qc_template_items (qc_template_id, item_name, order_index) VALUES (?, ?, ?)',
        [templateId, name, i]
      )
    }
    const [rows] = await db.execute(
      'SELECT * FROM qc_template_items WHERE qc_template_id = ? ORDER BY order_index ASC',
      [templateId]
    )
    return rows
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

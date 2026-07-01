import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const formId = Number(getRouterParam(event, 'id'))
  const { item_name, checker_ids } = await readBody(event)

  if (!item_name?.trim()) throw createError({ statusCode: 400, message: 'item_name required' })
  if (!Array.isArray(checker_ids) || checker_ids.length === 0) {
    throw createError({ statusCode: 400, message: 'checker_ids required' })
  }

  // Validate form is active
  const [[form]] = await db.execute(
    `SELECT id FROM qc_forms WHERE id = ? AND status = 'active'`, [formId]
  ) as any[]
  if (!form) throw createError({ statusCode: 404, message: 'QC Form tidak ditemukan atau sudah selesai' })

  const inserted: any[] = []
  for (const checkerId of checker_ids.map(Number).filter(Boolean)) {
    const [r] = await db.execute(
      `INSERT INTO qc_checklist_items (qc_form_id, checker_id, item_name, source) VALUES (?, ?, ?, 'manual')`,
      [formId, checkerId, item_name.trim()]
    ) as any[]
    const [[row]] = await db.execute(`SELECT * FROM qc_checklist_items WHERE id = ?`, [(r as any).insertId]) as any[]
    inserted.push(row)
  }
  return inserted
})

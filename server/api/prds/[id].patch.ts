import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['staff', 'admin'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const allowed = ['planned_start_date', 'original_due_date']
  const updates: string[] = []
  const values: any[] = []

  for (const key of allowed) {
    if (key in body) {
      // original_due_date is immutable once set — check current value
      if (key === 'original_due_date') {
        const [[row]] = await db.execute(`SELECT original_due_date FROM prds WHERE id = ?`, [id]) as any[]
        if (row?.original_due_date) {
          throw createError({ statusCode: 400, statusMessage: 'original_due_date sudah di-set dan tidak bisa diubah' })
        }
      }
      updates.push(`${key} = ?`)
      values.push(body[key] || null)
    }
  }

  if (!updates.length) throw createError({ statusCode: 400, statusMessage: 'No valid fields' })

  values.push(id)
  await db.execute(`UPDATE prds SET ${updates.join(', ')} WHERE id = ?`, values)

  return { ok: true }
})

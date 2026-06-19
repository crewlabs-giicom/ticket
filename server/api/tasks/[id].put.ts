import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const allowed = ['title', 'description', 'status', 'position', 'assigned_to', 'due_date']
  const sets: string[] = []
  const params: any[] = []

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`)
      let val = body[key] ?? null
      if (key === 'due_date' && val) val = String(val).slice(0, 10)
      params.push(val)
    }
  }

  if (!sets.length) throw createError({ statusCode: 400, message: 'Nothing to update' })

  params.push(id)
  await db.execute(`UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params)

  const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id])
  return (rows as any[])[0]
})

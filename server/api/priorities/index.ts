import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    return { success: true, data: db.prepare('SELECT * FROM priorities ORDER BY order_index ASC').all() }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const r = db.prepare('INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)').run(body.name, body.color || '#6366f1', body.order_index || 99, body.sla_hours || 24)
    return { success: true, data: db.prepare('SELECT * FROM priorities WHERE id = ?').get(r.lastInsertRowid) }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    // Bulk reorder
    if (Array.isArray(body)) {
      const update = db.prepare('UPDATE priorities SET order_index=? WHERE id=?')
      const tx = db.transaction((items: any[]) => items.forEach(i => update.run(i.order_index, i.id)))
      tx(body)
      return { success: true }
    }
  }
})

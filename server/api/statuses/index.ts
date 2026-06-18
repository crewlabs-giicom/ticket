import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    return { success: true, data: db.prepare('SELECT * FROM ticket_statuses ORDER BY order_index ASC').all() }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const r = db.prepare('INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)').run(body.name, body.color || '#6366f1', body.order_index || 99, body.is_resolved ? 1 : 0)
    return { success: true, data: db.prepare('SELECT * FROM ticket_statuses WHERE id = ?').get(r.lastInsertRowid) }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    if (Array.isArray(body)) {
      const update = db.prepare('UPDATE ticket_statuses SET order_index=? WHERE id=?')
      const tx = db.transaction((items: any[]) => items.forEach(i => update.run(i.order_index, i.id)))
      tx(body)
      return { success: true }
    }
  }
})

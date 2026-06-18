import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    if (user.role === 'admin') {
      return { success: true, data: db.prepare('SELECT * FROM menus ORDER BY order_index ASC').all() }
    }
    const menus = db.prepare('SELECT * FROM menus WHERE is_active=1 AND (role="all" OR role=?) ORDER BY order_index ASC').all(user.role)
    return { success: true, data: menus }
  }

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'POST') {
    const body = await readBody(event)
    const r = db.prepare('INSERT INTO menus (name, path, icon, order_index, role) VALUES (?, ?, ?, ?, ?)').run(body.name, body.path, body.icon, body.order_index || 99, body.role || 'all')
    return { success: true, data: db.prepare('SELECT * FROM menus WHERE id=?').get(r.lastInsertRowid) }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    // Bulk reorder
    if (Array.isArray(body)) {
      const upd = db.prepare('UPDATE menus SET order_index=? WHERE id=?')
      const tx = db.transaction((items: any[]) => items.forEach(i => upd.run(i.order_index, i.id)))
      tx(body)
      return { success: true }
    }
  }
})

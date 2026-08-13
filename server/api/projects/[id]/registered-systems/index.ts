import { randomBytes } from 'node:crypto'
import { getDb } from '../../../../database/index'

const DEFAULT_EVENTS = 'ticket.created,ticket.commented,ticket.closed,ticket.status_changed'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const projectId = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(
      `SELECT id, name, description, webhook_url, webhook_events, is_active, created_at, updated_at
       FROM registered_systems WHERE project_id = ? ORDER BY id DESC`,
      [projectId]
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const [projRows] = await db.execute('SELECT id FROM projects WHERE id = ?', [projectId])
    if (!(projRows as any[])[0]) throw createError({ statusCode: 404, statusMessage: 'Project tidak ditemukan' })

    const body = await readBody(event)
    const { name, description, webhook_url, webhook_events } = body
    if (!name || !String(name).trim()) throw createError({ statusCode: 400, statusMessage: 'name wajib diisi' })

    const apiKey = randomBytes(24).toString('hex')
    const webhookSecret = webhook_url ? randomBytes(24).toString('hex') : null

    const [r]: any = await db.execute(
      `INSERT INTO registered_systems (project_id, name, description, api_key, webhook_url, webhook_secret, webhook_events, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, String(name).trim(), description || null, apiKey, webhook_url || null, webhookSecret, webhook_events || DEFAULT_EVENTS, user.id]
    )

    return {
      success: true,
      data: { id: r.insertId, api_key: apiKey, webhook_secret: webhookSecret },
    }
  }
})

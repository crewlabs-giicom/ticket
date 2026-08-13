import { randomBytes } from 'node:crypto'
import { getDb } from '../../../database/index'

function maskSecret(secret: string) {
  return secret.length <= 4 ? '****' : `${'*'.repeat(secret.length - 4)}${secret.slice(-4)}`
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (event.method === 'GET') {
    const [rows] = await db.execute(
      'SELECT id, url, events, is_active, created_at, updated_at, secret FROM project_webhooks WHERE project_id = ?',
      [id]
    )
    const webhook = (rows as any[])[0]
    if (!webhook) return { data: null }
    webhook.secret = maskSecret(webhook.secret)
    return { data: webhook }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { url, events, is_active } = body
    if (!url) throw createError({ statusCode: 400, statusMessage: 'url wajib diisi' })

    const [existingRows] = await db.execute('SELECT id, secret FROM project_webhooks WHERE project_id = ?', [id])
    const existing = (existingRows as any[])[0]

    if (existing) {
      await db.execute(
        'UPDATE project_webhooks SET url=?, events=COALESCE(?, events), is_active=?, updated_at=NOW() WHERE id=?',
        [url, events || null, is_active ?? 1, existing.id]
      )
      return { success: true, data: { id: existing.id, secret_regenerated: false } }
    }

    const secret = randomBytes(24).toString('hex')
    const finalEvents = events || 'ticket.created,ticket.commented,ticket.closed,ticket.status_changed'
    const [r]: any = await db.execute(
      'INSERT INTO project_webhooks (project_id, url, secret, events, is_active) VALUES (?, ?, ?, ?, ?)',
      [id, url, secret, finalEvents, is_active ?? 1]
    )
    // Secret ditampilkan sekali saja saat pertama kali dibuat
    return { success: true, data: { id: r.insertId, secret } }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM project_webhooks WHERE project_id = ?', [id])
    return { success: true }
  }
})

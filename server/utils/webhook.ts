import type mysql from 'mysql2/promise'
import { createHmac } from 'node:crypto'

interface WebhookRow {
  id: number
  project_id: number
  url: string
  secret: string
  events: string
  is_active: number
}

/**
 * Fire-and-forget delivery: caller does not wait for the receiving endpoint to
 * process the event, only for the HTTP request to complete (no retry/queue).
 * Every attempt is logged to webhook_deliveries for later auditing.
 */
export async function triggerWebhook(db: mysql.Pool, projectId: number, event: string, payload: object) {
  const [rows] = await db.execute(
    'SELECT id, project_id, url, secret, events, is_active FROM project_webhooks WHERE project_id = ? AND is_active = 1',
    [projectId]
  )
  const webhooks = (rows as WebhookRow[]).filter(w => w.events.split(',').map(e => e.trim()).includes(event))
  if (!webhooks.length) return

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })

  await Promise.allSettled(webhooks.map(async (webhook) => {
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex')
    let responseStatus: number | null = null
    let success = 0
    let error: string | null = null
    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        body,
      })
      responseStatus = res.status
      success = res.ok ? 1 : 0
    } catch (e: any) {
      error = String(e?.message || e)
    }
    await db.execute(
      'INSERT INTO webhook_deliveries (project_webhook_id, event, payload, response_status, success, error) VALUES (?, ?, ?, ?, ?, ?)',
      [webhook.id, event, body, responseStatus, success, error]
    ).catch(() => {})
  }))
}

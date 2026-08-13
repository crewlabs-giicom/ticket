import type mysql from 'mysql2/promise'
import { createHmac } from 'node:crypto'

interface RegisteredSystemWebhookRow {
  id: number
  webhook_url: string
  webhook_secret: string
  webhook_events: string
}

/**
 * Fire-and-forget delivery: caller does not wait for the receiving endpoint to
 * process the event, only for the HTTP request to complete (no retry/queue).
 * Every attempt is logged to webhook_deliveries for later auditing.
 *
 * Broadcasts to EVERY active registered system on the project that subscribes to
 * `event` — not just the system whose API key triggered the action — so other
 * integrations watching the same project also get notified.
 */
export async function triggerWebhook(db: mysql.Pool, projectId: number, event: string, payload: object) {
  const [rows] = await db.execute(
    `SELECT id, webhook_url, webhook_secret, webhook_events FROM registered_systems
     WHERE project_id = ? AND is_active = 1 AND webhook_url IS NOT NULL`,
    [projectId]
  )
  const systems = (rows as RegisteredSystemWebhookRow[]).filter(
    s => s.webhook_events.split(',').map(e => e.trim()).includes(event)
  )
  if (!systems.length) return

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })

  await Promise.allSettled(systems.map(async (system) => {
    const signature = createHmac('sha256', system.webhook_secret || '').update(body).digest('hex')
    let responseStatus: number | null = null
    let success = 0
    let error: string | null = null
    try {
      const res = await fetch(system.webhook_url, {
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
      'INSERT INTO webhook_deliveries (registered_system_id, event, payload, response_status, success, error) VALUES (?, ?, ?, ?, ?, ?)',
      [system.id, event, body, responseStatus, success, error]
    ).catch(() => {})
  }))
}

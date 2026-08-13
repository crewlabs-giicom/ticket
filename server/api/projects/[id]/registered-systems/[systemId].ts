import { randomBytes } from 'node:crypto'
import { getDb } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const projectId = getRouterParam(event, 'id')
  const systemId = getRouterParam(event, 'systemId')

  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const [existingRows] = await db.execute(
    'SELECT id, webhook_url FROM registered_systems WHERE id = ? AND project_id = ?',
    [systemId, projectId]
  )
  const existing = (existingRows as any[])[0]
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Sistem terdaftar tidak ditemukan' })

  if (event.method === 'PATCH') {
    const body = await readBody(event)
    const { name, description, webhook_url, webhook_events, is_active } = body

    let webhookSecretResult: string | null = null
    let webhookSecretSql = 'webhook_secret'
    const params: any[] = []

    const hadWebhookUrl = !!existing.webhook_url
    const willHaveWebhookUrl = webhook_url !== undefined ? !!webhook_url : hadWebhookUrl

    if (!hadWebhookUrl && willHaveWebhookUrl) {
      webhookSecretResult = randomBytes(24).toString('hex')
      webhookSecretSql = '?'
      params.push(webhookSecretResult)
    }

    await db.execute(
      `UPDATE registered_systems SET
        name = COALESCE(?, name),
        description = ?,
        webhook_url = ?,
        webhook_events = COALESCE(?, webhook_events),
        is_active = COALESCE(?, is_active),
        webhook_secret = ${webhookSecretSql},
        updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? null, description ?? null, webhook_url ?? null, webhook_events ?? null,
        is_active !== undefined ? is_active : null, ...params, systemId,
      ]
    )

    return { success: true, data: { webhook_secret: webhookSecretResult } }
  }

  if (event.method === 'DELETE') {
    await db.execute('DELETE FROM registered_systems WHERE id = ?', [systemId])
    return { success: true }
  }
})

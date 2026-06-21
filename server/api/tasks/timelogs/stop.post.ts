import { getDb } from '../../../database/index'

// sendBeacon-compatible endpoint — no auth header, just log_id in body
// Used by the browser timer-cleanup plugin when tab/browser closes
export default defineEventHandler(async (event) => {
  const db = getDb()

  let body: any = {}
  try {
    const raw = await readRawBody(event)
    if (raw) body = JSON.parse(raw)
  } catch {
    body = await readBody(event).catch(() => ({}))
  }

  const logId = Number(body?.log_id)
  if (!logId) return { ok: false }

  await db.execute(
    `UPDATE task_timelogs
     SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
     WHERE id = ? AND stopped_at IS NULL`,
    [logId]
  )

  return { ok: true }
})

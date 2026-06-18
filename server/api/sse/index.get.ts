import { addSSEClient, removeSSEClient } from '../../utils/sse'
import { getUserFromEvent } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = getUserFromEvent(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const send = (data: string) => {
    try { event.node.res.write(data) } catch {}
  }

  send(`data: connected\n\n`)
  addSSEClient(user.id, send)

  // Keepalive
  const interval = setInterval(() => {
    try { send(`:keepalive\n\n`) } catch { clearInterval(interval) }
  }, 25000)

  event.node.req.on('close', () => {
    clearInterval(interval)
    removeSSEClient(send)
  })

  await new Promise(() => {}) // Keep connection open
})

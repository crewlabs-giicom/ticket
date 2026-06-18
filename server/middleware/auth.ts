import { getUserFromEvent } from '../utils/auth'

export default defineEventHandler((event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (path === '/api/auth/login' || path === '/api/auth/register') return
  if (path.startsWith('/api/sse')) return

  const user = getUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.user = user
})

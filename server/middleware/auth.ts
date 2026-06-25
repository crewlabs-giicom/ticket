import { getUserFromEvent } from '../utils/auth'

export default defineEventHandler((event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/auth/hris-login') return
  if (path.startsWith('/api/sse')) return
  if (path === '/api/health') return

  const user = getUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.user = user
})

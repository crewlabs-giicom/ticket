import type { H3Event } from 'h3'
import { getUserFromEvent } from './auth'

export function requireAuth(event: H3Event) {
  const user = getUserFromEvent(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
  return user
}

export function requireRole(event: H3Event, roles: string[]) {
  const user = requireAuth(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return user
}

export function isAdmin(user: any) {
  return user?.role === 'admin'
}

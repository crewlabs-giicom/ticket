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

export async function isProjectAdmin(db: any, userId: number, projectId: number): Promise<boolean> {
  const [rows] = await db.execute(
    "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND project_role = 'admin' LIMIT 1",
    [projectId, userId]
  ) as any[]
  return (rows as any[]).length > 0
}

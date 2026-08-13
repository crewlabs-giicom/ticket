import type mysql from 'mysql2/promise'

export interface ExternalProject {
  id: number
  name: string
  is_active: number
}

export async function resolveProjectByApiKey(db: mysql.Pool, apiKey: string): Promise<ExternalProject | null> {
  const [rows] = await db.execute(
    'SELECT id, name, is_active FROM projects WHERE api_key = ?',
    [apiKey]
  )
  return (rows as ExternalProject[])[0] || null
}

export async function resolveUserByEmail(db: mysql.Pool, email: string): Promise<{ id: number; name: string } | null> {
  const [rows] = await db.execute(
    'SELECT id, name FROM users WHERE email = ? AND is_active = 1',
    [email]
  )
  return (rows as { id: number; name: string }[])[0] || null
}

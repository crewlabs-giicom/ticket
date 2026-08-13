import type mysql from 'mysql2/promise'

export interface RegisteredSystem {
  id: number
  project_id: number
  project_name: string
  project_is_active: number
  name: string
  is_active: number
}

export async function resolveRegisteredSystemByApiKey(db: mysql.Pool, apiKey: string): Promise<RegisteredSystem | null> {
  const [rows] = await db.execute(
    `SELECT rs.id, rs.project_id, rs.name, rs.is_active, p.name AS project_name, p.is_active AS project_is_active
     FROM registered_systems rs JOIN projects p ON p.id = rs.project_id
     WHERE rs.api_key = ?`,
    [apiKey]
  )
  return (rows as RegisteredSystem[])[0] || null
}

export async function resolveUserByEmail(db: mysql.Pool, email: string): Promise<{ id: number; name: string } | null> {
  const [rows] = await db.execute(
    'SELECT id, name FROM users WHERE email = ? AND is_active = 1',
    [email]
  )
  return (rows as { id: number; name: string }[])[0] || null
}

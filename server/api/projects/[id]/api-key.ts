import { randomBytes } from 'node:crypto'
import { getDb } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'POST') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const [projRows] = await db.execute('SELECT id FROM projects WHERE id = ?', [id])
    if (!(projRows as any[])[0]) throw createError({ statusCode: 404, statusMessage: 'Project tidak ditemukan' })

    const apiKey = randomBytes(24).toString('hex')
    await db.execute('UPDATE projects SET api_key = ?, updated_at = NOW() WHERE id = ?', [apiKey, id])

    // Ditampilkan sekali saja — setelah ini hanya masked value yang tersedia via GET project
    return { success: true, data: { api_key: apiKey } }
  }

  if (event.method === 'DELETE') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    await db.execute('UPDATE projects SET api_key = NULL, updated_at = NOW() WHERE id = ?', [id])
    return { success: true }
  }
})

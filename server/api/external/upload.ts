import { getDb } from '../../database/index'
import { resolveRegisteredSystemByApiKey } from '../../utils/externalAuth'
import { saveUploadedFile } from '../../utils/fileStorage'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const db = getDb()
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) throw createError({ statusCode: 401, statusMessage: 'X-API-Key header wajib diisi' })

  const system = await resolveRegisteredSystemByApiKey(db, apiKey)
  if (!system) throw createError({ statusCode: 401, statusMessage: 'API key tidak valid' })
  if (!system.is_active) throw createError({ statusCode: 403, statusMessage: 'Sistem tidak aktif' })
  if (!system.project_is_active) throw createError({ statusCode: 403, statusMessage: 'Project tidak aktif' })

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada file yang dikirim' })
  }

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Field "file" tidak ditemukan' })
  }

  const data = await saveUploadedFile({
    data: filePart.data,
    mime: filePart.type || 'application/octet-stream',
    originalName: filePart.filename || 'file',
    menu: 'ticket',
    projectId: String(system.project_id),
    projectName: system.project_name,
  })

  return { success: true, data }
})

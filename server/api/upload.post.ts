import { writeFileSync } from 'fs'
import { join, extname } from 'path'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/csv',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada file yang dikirim' })
  }

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Field "file" tidak ditemukan' })
  }

  const mime = filePart.type || 'application/octet-stream'
  if (!ALLOWED_TYPES.includes(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak diizinkan' })
  }

  if (filePart.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran file maksimal 10MB' })
  }

  const originalName = filePart.filename || 'file'
  const ext = extname(originalName) || ''
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads')
  writeFileSync(join(uploadDir, uniqueName), filePart.data)

  return {
    success: true,
    data: {
      filename: uniqueName,
      original_name: originalName,
      mime_type: mime,
      size: filePart.data.length,
    }
  }
})

import { writeFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import sharp from 'sharp'

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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
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
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const uploadDir = join(process.cwd(), 'storage', 'uploads')
  mkdirSync(uploadDir, { recursive: true })

  let uniqueName: string
  let fileData: Buffer
  let finalMime = mime

  if (IMAGE_TYPES.includes(mime)) {
    uniqueName = `${baseName}.jpg`
    fileData = await sharp(filePart.data)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    finalMime = 'image/jpeg'
  } else {
    const ext = extname(originalName) || ''
    uniqueName = `${baseName}${ext}`
    fileData = filePart.data
  }

  writeFileSync(join(uploadDir, uniqueName), fileData)

  return {
    success: true,
    data: {
      filename: uniqueName,
      original_name: originalName,
      mime_type: finalMime,
      size: fileData.length,
    }
  }
})

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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20) || 'project'
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada file yang dikirim' })
  }

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Field "file" tidak ditemukan' })
  }

  const getField = (name: string) => {
    const p = parts.find(f => f.name === name)
    return p ? Buffer.from(p.data).toString('utf8').trim() : ''
  }

  const menu = getField('menu') || 'general'
  const projectId = getField('project_id')
  const projectName = getField('project_name')

  const mime = filePart.type || 'application/octet-stream'
  if (!ALLOWED_TYPES.includes(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak diizinkan' })
  }

  if (filePart.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran file maksimal 10MB' })
  }

  const originalName = filePart.filename || 'file'
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  let subPath: string
  if (menu === 'profile') {
    subPath = `profile/${today}`
  } else if (['ticket', 'task'].includes(menu) && projectId) {
    const slug = slugify(projectName || `project${projectId}`)
    subPath = `${menu}/${projectId}_${slug}/${today}`
  } else {
    subPath = `general/${today}`
  }

  const uploadDir = join(process.cwd(), 'storage', 'uploads', subPath)
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
      filename: `${subPath}/${uniqueName}`,
      original_name: originalName,
      mime_type: finalMime,
      size: fileData.length,
    }
  }
})

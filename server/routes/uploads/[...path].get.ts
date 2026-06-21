import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain',
  csv: 'text/csv',
}

export default defineEventHandler((event) => {
  const path = getRouterParam(event, 'path')
  if (!path || path.includes('..')) throw createError({ statusCode: 400 })

  const filePath = join(process.cwd(), 'storage', 'uploads', path)
  if (!existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan' })

  const ext = path.split('.').pop()?.toLowerCase() || ''
  const mimeType = MIME_MAP[ext] || 'application/octet-stream'

  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  return readFileSync(filePath)
})

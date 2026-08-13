import { saveUploadedFile } from '../utils/fileStorage'

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

  const data = await saveUploadedFile({
    data: filePart.data,
    mime: filePart.type || 'application/octet-stream',
    originalName: filePart.filename || 'file',
    menu,
    projectId,
    projectName,
  })

  return { success: true, data }
})

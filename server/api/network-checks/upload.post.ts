import { requireInfraUser } from '../../utils/infra'

const MAX_BYTES = 20 * 1024 * 1024

// Menerima payload dari browser untuk tes kecepatan upload; data langsung dibuang.
export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  const declared = Number(getRequestHeader(event, 'content-length') || 0)
  if (declared > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Payload terlalu besar' })
  const body = await readRawBody(event, false)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { bytes: body?.length ?? 0 }
})

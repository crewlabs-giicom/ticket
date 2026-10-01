import { requireInfraUser } from '../../utils/infra'

// Respons sekecil mungkin; dipakai browser untuk mengukur latency/jitter/packet loss.
export default defineEventHandler((event) => {
  requireInfraUser(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { t: Date.now() }
})

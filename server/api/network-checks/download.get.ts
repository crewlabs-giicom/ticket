import { randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'
import { requireInfraUser } from '../../utils/infra'

const MAX_MB = 20
const CHUNK = randomBytes(256 * 1024) // data acak (tidak terkompresi), dipakai ulang

// Mengalirkan N MB data untuk tes kecepatan download dari browser.
export default defineEventHandler((event) => {
  requireInfraUser(event)
  const mb = Math.min(Math.max(Number(getQuery(event).mb) || 5, 1), MAX_MB)
  const total = mb * 1024 * 1024
  let sent = 0
  const stream = new Readable({
    read() {
      if (sent >= total) return this.push(null)
      const n = Math.min(CHUNK.length, total - sent)
      sent += n
      this.push(n === CHUNK.length ? CHUNK : CHUNK.subarray(0, n))
    },
  })
  setResponseHeaders(event, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(total),
    'Cache-Control': 'no-store',
    'Content-Encoding': 'identity',
  })
  return sendStream(event, stream)
})

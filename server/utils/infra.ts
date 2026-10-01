import type { H3Event } from 'h3'
import { requireRole } from './rbac'

/** Admin & staff boleh baca dan menjalankan check; customer ditolak. */
export function requireInfraUser(event: H3Event) {
  return requireRole(event, ['admin', 'staff'])
}

/** Hanya admin yang boleh mengubah data master infrastruktur. */
export function requireInfraAdmin(event: H3Event) {
  return requireRole(event, ['admin'])
}

/** Ambang batas penilaian network check (satu tempat agar mudah diubah). */
export const NETWORK_THRESHOLDS = {
  good: { latency: 50, jitter: 20, loss: 1 },
  fair: { latency: 150, jitter: 50, loss: 5 },
}

const num = (v: any): number | null => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

export function computeNetworkStatus(m: { latency_ms?: any; jitter_ms?: any; download_jitter_ms?: any; upload_jitter_ms?: any; packet_loss_pct?: any }): 'good' | 'fair' | 'poor' {
  const latency = num(m.latency_ms)
  const loss = num(m.packet_loss_pct)
  const jitter = Math.max(num(m.jitter_ms) ?? 0, num(m.download_jitter_ms) ?? 0, num(m.upload_jitter_ms) ?? 0)
  const within = (t: { latency: number; jitter: number; loss: number }) =>
    (latency === null || latency <= t.latency) && jitter <= t.jitter && (loss === null || loss <= t.loss)
  if (within(NETWORK_THRESHOLDS.good)) return 'good'
  if (within(NETWORK_THRESHOLDS.fair)) return 'fair'
  return 'poor'
}

export { num as toNum }

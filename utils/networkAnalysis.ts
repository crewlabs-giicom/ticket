/** Ambang batas penilaian network check (dipakai server & client). */
export const NETWORK_THRESHOLDS = {
  good: { latency: 50, jitter: 20, loss: 1 },
  fair: { latency: 150, jitter: 50, loss: 5 },
}

export type NetworkLevel = 'good' | 'fair' | 'poor'
export interface NetworkFinding { metric: 'latency' | 'jitter' | 'loss'; value: number; limit: number; level: 'fair' | 'poor' }

const toNum = (v: any): number | null => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Metrik yang melewati batas "good" (level fair) atau batas "fair" (level poor). */
export function explainNetworkStatus(m: { latency_ms?: any; jitter_ms?: any; download_jitter_ms?: any; upload_jitter_ms?: any; packet_loss_pct?: any }): NetworkFinding[] {
  const latency = toNum(m.latency_ms)
  const loss = toNum(m.packet_loss_pct)
  const jitter = Math.max(toNum(m.jitter_ms) ?? 0, toNum(m.download_jitter_ms) ?? 0, toNum(m.upload_jitter_ms) ?? 0)
  const g = NETWORK_THRESHOLDS.good
  const f = NETWORK_THRESHOLDS.fair
  const out: NetworkFinding[] = []
  const check = (metric: NetworkFinding['metric'], value: number | null, good: number, fair: number) => {
    if (value === null || value <= good) return
    out.push({ metric, value, limit: value > fair ? fair : good, level: value > fair ? 'poor' : 'fair' })
  }
  check('latency', latency, g.latency, f.latency)
  check('jitter', jitter, g.jitter, f.jitter)
  check('loss', loss, g.loss, f.loss)
  return out
}

import { DEFAULT_THRESHOLDS, type QualityThresholds } from './analytics'

const num = (v: unknown, def: number) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? def : Number(v))

export function pingConfig() {
  const c: any = useRuntimeConfig().routeros || {}
  const targets = String(c.pingTargets || '1.1.1.1,8.8.8.8').split(',').map(s => s.trim()).filter(Boolean)
  const thresholds: QualityThresholds = {
    latencyWarn: num(c.pingLatencyWarn, DEFAULT_THRESHOLDS.latencyWarn), latencyBad: num(c.pingLatencyBad, DEFAULT_THRESHOLDS.latencyBad),
    jitterWarn: num(c.pingJitterWarn, DEFAULT_THRESHOLDS.jitterWarn), jitterBad: num(c.pingJitterBad, DEFAULT_THRESHOLDS.jitterBad),
    lossWarn: num(c.pingLossWarn, DEFAULT_THRESHOLDS.lossWarn), lossBad: num(c.pingLossBad, DEFAULT_THRESHOLDS.lossBad),
  }
  return { targets, intervalSec: Math.max(10, num(c.pingIntervalSec, 30)), count: 5, thresholds }
}

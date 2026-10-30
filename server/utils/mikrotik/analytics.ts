// Logika murni Analitik Jaringan (tanpa I/O) supaya bisa di-unit-test.

export type RangeKey = '1h' | '24h' | '7d' | '30d'

export const RANGES: Record<RangeKey, { ms: number; bucketSec: number }> = {
  '1h': { ms: 3600_000, bucketSec: 60 },
  '24h': { ms: 24 * 3600_000, bucketSec: 300 },
  '7d': { ms: 7 * 24 * 3600_000, bucketSec: 1800 },
  '30d': { ms: 30 * 24 * 3600_000, bucketSec: 7200 },
}

export function parseRange(v: unknown): RangeKey {
  return typeof v === 'string' && v in RANGES ? (v as RangeKey) : '24h'
}

/** Persentil (nearest-rank) dari array angka; 0 bila kosong. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  return s[idx]
}

export interface RateBucket { ts: number; rxAvg: number; txAvg: number; rxMax: number; txMax: number }

export interface RateSummary {
  rxAvg: number; txAvg: number; rxPeak: number; txPeak: number
  rxP95: number; txP95: number
  /** Perkiraan total byte dari rate rata-rata per bucket (tahan reset counter saat router reboot). */
  rxBytes: number; txBytes: number
  samples: number
}

export function summarizeRates(buckets: RateBucket[], bucketSec: number): RateSummary {
  const n = buckets.length
  const sum = (f: (b: RateBucket) => number) => buckets.reduce((a, b) => a + f(b), 0)
  return {
    rxAvg: n ? sum(b => b.rxAvg) / n : 0,
    txAvg: n ? sum(b => b.txAvg) / n : 0,
    rxPeak: n ? Math.max(...buckets.map(b => b.rxMax)) : 0,
    txPeak: n ? Math.max(...buckets.map(b => b.txMax)) : 0,
    rxP95: percentile(buckets.map(b => b.rxAvg), 95),
    txP95: percentile(buckets.map(b => b.txAvg), 95),
    rxBytes: sum(b => b.rxAvg) * bucketSec / 8,
    txBytes: sum(b => b.txAvg) * bucketSec / 8,
    samples: n,
  }
}

/** Selisih counter kumulatif; counter yang turun (reset/reboot) dianggap 0. */
export function counterDelta(min: number | null, max: number | null): number {
  if (min === null || max === null) return 0
  return Math.max(0, max - min)
}

export interface WanEventRow { interface_name: string; went_down_at: number; recovered_at: number | null }

export interface Availability { name: string; downMs: number; availabilityPct: number; incidents: number; mttrMs: number }

/** Availability per interface WAN pada jendela [from, to] (ms). Event terbuka dihitung sampai `to`. */
export function computeAvailability(events: WanEventRow[], names: string[], from: number, to: number): Availability[] {
  const window = Math.max(1, to - from)
  return names.map((name) => {
    let downMs = 0
    let incidents = 0
    let recoveredMs = 0
    let recoveredCount = 0
    for (const e of events) {
      if (e.interface_name !== name) continue
      const start = Math.max(from, e.went_down_at)
      const end = Math.min(to, e.recovered_at ?? to)
      if (end <= start) continue
      downMs += end - start
      incidents++
      if (e.recovered_at !== null) { recoveredMs += e.recovered_at - e.went_down_at; recoveredCount++ }
    }
    return {
      name, downMs, incidents,
      availabilityPct: Math.max(0, Math.min(100, 100 - (downMs / window) * 100)),
      mttrMs: recoveredCount ? recoveredMs / recoveredCount : 0,
    }
  })
}

/** Jumlah host usable subnet IPv4 dari notasi CIDR ("192.168.1.0/24" -> 254). */
export function cidrHostCapacity(cidr: string): number {
  const prefix = Number(cidr.split('/')[1])
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return 0
  if (prefix >= 31) return prefix === 32 ? 1 : 2
  return 2 ** (32 - prefix) - 2
}

export interface HeatCell { dow: number; hour: number; bps: number }

/** Matriks 7 (Min..Sab) x 24 jam dari baris { dow: 1..7 (MySQL DAYOFWEEK), hour, bps }. */
export function buildHeatmap(rows: Array<{ dow: number; hour: number; bps: number }>): { cells: number[][]; max: number; busiestHour: number | null } {
  const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  const perHour = Array<number>(24).fill(0)
  const perHourN = Array<number>(24).fill(0)
  let max = 0
  for (const r of rows) {
    const d = r.dow - 1
    if (d < 0 || d > 6 || r.hour < 0 || r.hour > 23) continue
    cells[d][r.hour] = r.bps
    if (r.bps > max) max = r.bps
    perHour[r.hour] += r.bps
    perHourN[r.hour]++
  }
  let busiestHour: number | null = null
  let best = 0
  for (let h = 0; h < 24; h++) {
    const avg = perHourN[h] ? perHour[h] / perHourN[h] : 0
    if (avg > best) { best = avg; busiestHour = h }
  }
  return { cells, max, busiestHour }
}

export interface Insight { level: 'warn' | 'crit' | 'info'; key: string; params: Record<string, string | number> }

export interface IfaceHealth { name: string; errors: number; drops: number; linkDowns: number }

export function interfaceInsights(items: IfaceHealth[], availability: Availability[]): Insight[] {
  const out: Insight[] = []
  for (const i of items) {
    if (i.errors > 0) out.push({ level: i.errors >= 100 ? 'crit' : 'warn', key: 'iface_errors', params: { name: i.name, count: i.errors } })
    if (i.drops > 0) out.push({ level: i.drops >= 1000 ? 'crit' : 'warn', key: 'iface_drops', params: { name: i.name, count: i.drops } })
    if (i.linkDowns >= 3) out.push({ level: 'crit', key: 'iface_flap', params: { name: i.name, count: i.linkDowns } })
  }
  for (const a of availability) {
    if (a.incidents > 0) {
      out.push({ level: a.availabilityPct < 99 ? 'crit' : 'warn', key: 'wan_incidents', params: { name: a.name, count: a.incidents, pct: Number(a.availabilityPct.toFixed(2)) } })
    }
  }
  return out
}

export function subnetInsights(items: Array<{ cidr: string; total: number; capacity: number }>): Insight[] {
  const out: Insight[] = []
  for (const s of items) {
    if (!s.capacity) continue
    const pct = Math.round((s.total / s.capacity) * 100)
    if (pct >= 80) out.push({ level: pct >= 95 ? 'crit' : 'warn', key: 'subnet_full', params: { cidr: s.cidr, pct } })
  }
  return out
}

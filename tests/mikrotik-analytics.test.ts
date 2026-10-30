import { describe, it, expect } from 'vitest'
import {
  parseRange, percentile, summarizeRates, counterDelta, computeAvailability, cidrHostCapacity,
  buildHeatmap, interfaceInsights, subnetInsights,
} from '../server/utils/mikrotik/analytics'

describe('parseRange', () => {
  it('menerima rentang valid, selain itu 24h', () => {
    expect(parseRange('7d')).toBe('7d')
    expect(parseRange('1y')).toBe('24h')
    expect(parseRange(undefined)).toBe('24h')
  })
})

describe('percentile', () => {
  it('nearest-rank', () => {
    const v = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(v, 95)).toBe(95)
    expect(percentile([5], 95)).toBe(5)
    expect(percentile([], 95)).toBe(0)
  })
})

describe('summarizeRates', () => {
  it('rata-rata, puncak, dan total byte dari rate', () => {
    const s = summarizeRates([
      { ts: 0, rxAvg: 8000, txAvg: 0, rxMax: 16000, txMax: 0 },
      { ts: 60000, rxAvg: 8000, txAvg: 0, rxMax: 9000, txMax: 0 },
    ], 60)
    expect(s.rxAvg).toBe(8000)
    expect(s.rxPeak).toBe(16000)
    expect(s.rxBytes).toBe(2 * 8000 * 60 / 8)
    expect(summarizeRates([], 60).samples).toBe(0)
  })
})

describe('counterDelta', () => {
  it('selisih max-min, null atau negatif jadi 0', () => {
    expect(counterDelta(10, 25)).toBe(15)
    expect(counterDelta(null, 5)).toBe(0)
    expect(counterDelta(30, 10)).toBe(0)
  })
})

describe('computeAvailability', () => {
  const H = 3600_000
  it('memotong event ke jendela dan menghitung MTTR', () => {
    const ev = [
      { interface_name: 'ether1', went_down_at: 0, recovered_at: H },        // sebagian di luar jendela
      { interface_name: 'ether1', went_down_at: 5 * H, recovered_at: 6 * H },
      { interface_name: 'ether2', went_down_at: 9 * H, recovered_at: null },  // masih terbuka
    ]
    const [a, b] = computeAvailability(ev, ['ether1', 'ether2'], H / 2, 10 * H)
    expect(a.downMs).toBe(H / 2 + H)
    expect(a.incidents).toBe(2)
    expect(a.mttrMs).toBe(H)
    expect(b.downMs).toBe(H)
    expect(b.availabilityPct).toBeCloseTo(100 - (H / (9.5 * H)) * 100, 5)
  })
  it('tanpa event = 100%', () => {
    expect(computeAvailability([], ['x'], 0, H)[0].availabilityPct).toBe(100)
  })
})

describe('cidrHostCapacity', () => {
  it('menghitung host usable', () => {
    expect(cidrHostCapacity('192.168.1.0/24')).toBe(254)
    expect(cidrHostCapacity('10.0.0.0/30')).toBe(2)
    expect(cidrHostCapacity('10.0.0.1/32')).toBe(1)
    expect(cidrHostCapacity('bad')).toBe(0)
  })
})

describe('buildHeatmap', () => {
  it('mengisi matriks dan menentukan jam tersibuk', () => {
    const h = buildHeatmap([
      { dow: 1, hour: 20, bps: 100 }, { dow: 2, hour: 20, bps: 300 }, { dow: 2, hour: 3, bps: 50 },
      { dow: 9, hour: 1, bps: 999 }, // di luar rentang, diabaikan
    ])
    expect(h.cells[0][20]).toBe(100)
    expect(h.max).toBe(300)
    expect(h.busiestHour).toBe(20)
    expect(buildHeatmap([]).busiestHour).toBeNull()
  })
})

describe('insights', () => {
  it('interface error/flap dan WAN incident', () => {
    const out = interfaceInsights(
      [{ name: 'ether1', errors: 5, drops: 0, linkDowns: 4 }, { name: 'ether2', errors: 0, drops: 0, linkDowns: 0 }],
      [{ name: 'ether1', downMs: 1, availabilityPct: 98, incidents: 2, mttrMs: 1 }],
    )
    expect(out.map(i => i.key)).toEqual(['iface_errors', 'iface_flap', 'wan_incidents'])
    expect(out[2].level).toBe('crit')
  })
  it('subnet penuh', () => {
    const out = subnetInsights([{ cidr: 'a', total: 250, capacity: 254 }, { cidr: 'b', total: 10, capacity: 254 }, { cidr: 'c', total: 1, capacity: 0 }])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ key: 'subnet_full', level: 'crit' })
  })
})

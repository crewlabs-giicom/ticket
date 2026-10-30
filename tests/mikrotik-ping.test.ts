import { describe, it, expect } from 'vitest'
import {
  parseRosDuration, summarizePing, classifyQuality, pickRepresentative, nextQualityTransitions,
} from '../server/utils/mikrotik/analytics'
import { buildPingParams } from '../server/utils/mikrotik/guard'

describe('parseRosDuration', () => {
  it('membaca format RouterOS', () => {
    expect(parseRosDuration('12ms')).toBe(12)
    expect(parseRosDuration('1s200ms')).toBe(1200)
    expect(parseRosDuration('12ms500us')).toBeCloseTo(12.5)
    expect(parseRosDuration('300us')).toBeCloseTo(0.3)
    expect(parseRosDuration('')).toBeNull()
    expect(parseRosDuration('abc')).toBeNull()
  })
})

describe('summarizePing', () => {
  it('menghitung loss, rtt, dan jitter dari selisih RTT berurutan', () => {
    const s = summarizePing([{ time: '10ms' }, { time: '30ms' }, { status: 'timeout' }, { time: '20ms' }], 4)
    expect(s.received).toBe(3)
    expect(s.lossPct).toBe(25)
    expect(s.rttAvg).toBe(20)
    expect(s.rttMax).toBe(30)
    expect(s.jitter).toBe(15) // (|30-10| + |20-30|) / 2
  })
  it('semua timeout = loss 100%, tanpa rtt', () => {
    const s = summarizePing([{ status: 'timeout' }, { status: 'timeout' }], 2)
    expect(s.lossPct).toBe(100)
    expect(s.rttAvg).toBeNull()
    expect(s.jitter).toBeNull()
  })
})

describe('classifyQuality', () => {
  it('good / degraded / bad sesuai ambang, dengan alasan', () => {
    expect(classifyQuality({ rttAvg: 20, jitter: 3, lossPct: 0 }).quality).toBe('good')
    expect(classifyQuality({ rttAvg: 120, jitter: 3, lossPct: 0 })).toEqual({ quality: 'degraded', reasons: ['latency'] })
    const bad = classifyQuality({ rttAvg: 250, jitter: 80, lossPct: 1 })
    expect(bad.quality).toBe('bad')
    expect(bad.reasons).toEqual(['latency', 'jitter'])
  })
  it('tanpa balasan = bad karena loss', () => {
    expect(classifyQuality({ rttAvg: null, jitter: null, lossPct: 100 })).toEqual({ quality: 'bad', reasons: ['loss'] })
  })
})

describe('pickRepresentative', () => {
  it('loss terendah lalu rtt terendah', () => {
    const best = pickRepresentative([
      { lossPct: 20, rttAvg: 10 }, { lossPct: 0, rttAvg: 90 }, { lossPct: 0, rttAvg: 40 },
    ])
    expect(best).toEqual({ lossPct: 0, rttAvg: 40 })
    expect(pickRepresentative([])).toBeNull()
  })
})

describe('nextQualityTransitions', () => {
  it('bad setelah 3 berturut-turut, pulih setelah 3 non-bad, dan hanya sekali', () => {
    let streaks = new Map<string, { bad: number; good: number }>()
    let open = new Set<string>()
    const step = (q: 'good' | 'bad') => {
      const r = nextQualityTransitions(streaks, [{ name: 'e1', quality: q }], open)
      streaks = r.streaks
      r.wentBad.forEach(n => open.add(n))
      r.recovered.forEach(n => open.delete(n))
      return r
    }
    expect(step('bad').wentBad).toEqual([])
    expect(step('bad').wentBad).toEqual([])
    expect(step('bad').wentBad).toEqual(['e1'])
    expect(step('bad').wentBad).toEqual([]) // sudah terbuka
    expect(step('good').recovered).toEqual([])
    step('bad') // putus streak good
    expect(step('good').recovered).toEqual([])
    expect(step('good').recovered).toEqual([])
    expect(step('good').recovered).toEqual(['e1'])
  })
  it('insiden ditutup bila WAN hilang dari daftar', () => {
    const r = nextQualityTransitions(new Map(), [], new Set(['e9']))
    expect(r.recovered).toEqual(['e9'])
  })
})

describe('buildPingParams', () => {
  it('menyusun parameter aman', () => {
    expect(buildPingParams('1.1.1.1', 'ether1', 5)).toEqual(['=address=1.1.1.1', '=interface=ether1', '=count=5', '=interval=200ms'])
  })
  it('menolak target/interface/count liar', () => {
    expect(() => buildPingParams('1.1.1.1; /system reboot', 'ether1', 5)).toThrow()
    expect(() => buildPingParams('1.1.1.1', 'ether1\n=x=y', 5)).toThrow()
    expect(() => buildPingParams('1.1.1.1', 'ether1', 1000)).toThrow()
    expect(() => buildPingParams('', 'ether1', 5)).toThrow()
  })
})

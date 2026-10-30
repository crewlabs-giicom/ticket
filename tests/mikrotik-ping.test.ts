import { describe, it, expect } from 'vitest'
import {
  parseRosDuration, summarizePing, classifyQuality, pickRepresentative, nextQualityTransitions,
} from '../server/utils/mikrotik/analytics'
import { buildPingParams } from '../server/utils/mikrotik/guard'
import { resolveWanPing, type RosRow } from '../server/utils/mikrotik/logic'

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
  const ok = { target: '1.1.1.1', srcAddress: '192.168.20.2', count: 5 }
  it('menyusun parameter aman, routing-table hanya bila ada', () => {
    expect(buildPingParams(ok)).toEqual(['=address=1.1.1.1', '=src-address=192.168.20.2', '=count=5', '=interval=200ms'])
    expect(buildPingParams({ ...ok, routingTable: 'to_biznet' })).toContain('=routing-table=to_biznet')
  })
  it('menolak target/IP sumber/table/count liar', () => {
    expect(() => buildPingParams({ ...ok, target: '1.1.1.1; /system reboot' })).toThrow()
    expect(() => buildPingParams({ ...ok, srcAddress: '300.1.1.1' })).toThrow()
    expect(() => buildPingParams({ ...ok, srcAddress: 'ether1' })).toThrow()
    expect(() => buildPingParams({ ...ok, routingTable: 'x\n=y=z' })).toThrow()
    expect(() => buildPingParams({ ...ok, count: 1000 })).toThrow()
    expect(() => buildPingParams({ ...ok, target: '' })).toThrow()
  })
})

describe('resolveWanPing', () => {
  const addr = (address: string, iface: string): RosRow => ({ address, interface: iface, disabled: 'false' })
  const route = (gateway: string, table: string, distance = '1', extra: RosRow = {}): RosRow => ({ 'dst-address': '0.0.0.0/0', gateway, 'routing-table': table, distance, disabled: 'false', ...extra })
  const addresses = [addr('103.1.1.18/29', 'ether1'), addr('192.168.20.2/24', 'ether8'), addr('192.168.100.4/24', 'ether10')]

  it('route default non-main lewat WAN -> pakai tabel itu, gateway terbaca', () => {
    const s = resolveWanPing('ether8', addresses, [route('192.168.20.1', 'to_lc'), route('103.1.1.17', 'main')], [])
    expect(s).toEqual({ name: 'ether8', srcAddress: '192.168.20.2', gateway: '192.168.20.1', routingTable: 'to_lc' })
  })
  it('routing-mark (RouterOS 6) dan gateway berupa nama interface', () => {
    const s = resolveWanPing('ether8', addresses, [{ 'dst-address': '0.0.0.0/0', gateway: 'ether8', 'routing-mark': 'lc', disabled: 'false' }], [])
    expect(s?.routingTable).toBe('lc')
  })
  it('rule routing dengan src-address = IP WAN', () => {
    const s = resolveWanPing('ether8', addresses, [], [{ 'src-address': '192.168.20.2/32', table: 'to_lc', disabled: 'false' }])
    expect(s?.routingTable).toBe('to_lc')
  })
  it('WAN default main terbaik -> tanpa tabel', () => {
    const s = resolveWanPing('ether1', addresses, [route('103.1.1.17', 'main', '1'), route('192.168.100.1', 'main', '5')], [])
    expect(s).toEqual({ name: 'ether1', srcAddress: '103.1.1.18', gateway: '103.1.1.17', routingTable: null })
  })
  it('WAN cadangan di main (distance lebih besar) tanpa tabel khusus -> tidak terukur', () => {
    expect(resolveWanPing('ether10', addresses, [route('103.1.1.17', 'main', '1'), route('192.168.100.1', 'main', '5')], [])).toBeNull()
  })
  it('route disabled diabaikan; tanpa IP -> null', () => {
    expect(resolveWanPing('ether8', addresses, [route('192.168.20.1', 'to_lc', '1', { disabled: 'true' })], [])).toBeNull()
    expect(resolveWanPing('ether9', addresses, [], [])).toBeNull()
  })
})

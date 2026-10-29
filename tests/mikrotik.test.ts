import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  parseCidr, parseAddressEntry, interfaceRole, wanMemberSet, resolveJalur, buildViaEntries,
  buildClients, buildSubnetDefs, groupClients, routerIpSet, JALUR_UTAMA, nextWanTransitions, aggregateClientRates, type InterfaceRole, type RosRow,
} from '../server/utils/mikrotik/logic'
import { assertReadOnlyPath } from '../server/utils/mikrotik/guard'
import { mockRead } from '../server/utils/mikrotik/mock'

describe('parseCidr', () => {
  it('menghitung ulang network address dari prefix', () => {
    expect(parseCidr('10.10.4.7/24')?.cidr).toBe('10.10.4.0/24')
  })
  it('/32 dan /0', () => {
    expect(parseCidr('10.1.2.3/32')?.cidr).toBe('10.1.2.3/32')
    const all = parseCidr('10.1.2.3/0')!
    expect(all.cidr).toBe('0.0.0.0/0')
    expect(all.last).toBe(0xffffffff)
  })
  it('input tidak valid', () => {
    for (const bad of ['', 'abc', '10.0.0.1', '10.0.0.1/33', '300.1.1.1/24', '10.0.0/24']) expect(parseCidr(bad)).toBeNull()
  })
})

describe('parseAddressEntry', () => {
  it('IP tunggal, CIDR, range', () => {
    expect(parseAddressEntry('10.10.3.68')).toEqual({ first: parseCidr('10.10.3.68/32')!.first, last: parseCidr('10.10.3.68/32')!.first })
    const c = parseAddressEntry('10.10.3.0/24')!
    expect(c.last - c.first).toBe(255)
    const r = parseAddressEntry('10.10.96.10-10.10.96.20')!
    expect(r.last - r.first).toBe(10)
  })
  it('domain dan range terbalik diabaikan', () => {
    expect(parseAddressEntry('www.tiktok.com')).toBeNull()
    expect(parseAddressEntry('10.0.0.20-10.0.0.10')).toBeNull()
  })
})

describe('interfaceRole', () => {
  const none = new Set<string>()
  it('comment WAN / LAN', () => {
    expect(interfaceRole({ name: 'e1', comment: 'wan to x' }, none, false)).toBe('WAN')
    expect(interfaceRole({ name: 'e3', comment: 'LAN Ruko' }, none, false)).toBe('LAN')
  })
  it('anggota list WAN', () => {
    expect(interfaceRole({ name: 'e9', comment: '' }, wanMemberSet([{ list: 'WAN', interface: 'e9' }]), false)).toBe('WAN')
  })
  it('tanpa comment tapi punya IP -> LAN, kosong -> LAINNYA', () => {
    expect(interfaceRole({ name: 'e2' }, none, true)).toBe('LAN')
    expect(interfaceRole({ name: 'e5' }, none, false)).toBe('LAINNYA')
  })
})

describe('resolveJalur', () => {
  const via = buildViaEntries([
    { list: 'VIA BIZNET', address: '10.10.3.0/24' },
    { list: 'VIA INDIHOME', address: '10.10.3.68' },
    { list: 'VIA XL SATU', address: '10.10.96.10-10.10.96.20' },
    { list: 'VIA MAXINDO', address: '10.10.4.50', disabled: 'true' },
    { list: 'VIA BIZNET', address: 'contoh.com' },
    { list: 'ALL LAN', address: '10.10.0.0/16' },
  ])
  it('tanpa list -> jalur utama', () => {
    expect(resolveJalur('10.10.5.5', via)).toEqual({ jalur: JALUR_UTAMA, jalurList: null, jalurConflict: [] })
  })
  it('satu list (CIDR dan range)', () => {
    expect(resolveJalur('10.10.3.9', via).jalur).toBe('VIA BIZNET')
    expect(resolveJalur('10.10.96.15', via).jalur).toBe('VIA XL SATU')
  })
  it('konflik: list paling bawah menang', () => {
    const r = resolveJalur('10.10.3.68', via)
    expect(r.jalur).toBe('VIA BIZNET')
    expect(r.jalurConflict).toEqual(['VIA INDIHOME', 'VIA BIZNET'])
  })
  it('entry disabled dan list non-VIA diabaikan', () => {
    expect(resolveJalur('10.10.4.50', via).jalur).toBe(JALUR_UTAMA)
  })
})

describe('merge klien (mock data)', () => {
  const addresses = mockRead('/ip/address/print')
  const interfaces = mockRead('/interface/print')
  const wan = wanMemberSet(mockRead('/interface/list/member/print'))
  const roles = new Map<string, InterfaceRole>(interfaces.map(i => [i.name!, interfaceRole(i, wan, addresses.some(a => a.interface === i.name))]))
  const subnets = buildSubnetDefs(addresses, roles)
  const clients = buildClients({
    arp: mockRead('/ip/arp/print'), leases: mockRead('/ip/dhcp-server/lease/print'),
    addressList: mockRead('/ip/firewall/address-list/print'),
    subnets, routerIps: routerIpSet(addresses), roleByInterface: roles,
  })
  const find = (ip: string) => clients.find(c => c.ip === ip)!

  it('subnet LAN: WAN dikecualikan, ether11 punya dua subnet', () => {
    expect(subnets.map(s => s.cidr.cidr)).toEqual(['10.10.3.0/24', '10.10.4.0/24', '10.10.10.0/24', '10.10.96.0/24'])
  })
  it('IP router dan ARP di port WAN dikecualikan', () => {
    expect(clients.some(c => c.ip === '10.10.3.1' || c.ip === '103.209.250.17')).toBe(false)
  })
  it('lease-only = offline; ARP-only tanpa DHCP', () => {
    expect(find('10.10.3.80')).toMatchObject({ online: false, sources: ['dhcp'], interface: 'ether3', dhcpStatic: true })
    expect(find('10.10.3.70')).toMatchObject({ online: true, sources: ['arp'], dhcpStatic: null })
  })
  it('ARP + DHCP digabung per IP', () => {
    expect(find('10.10.3.10')).toMatchObject({ sources: ['arp', 'dhcp'], hostname: 'LAPTOP-ADMIN', dhcpStatic: false })
  })
  it('pengelompokan: urut IP numerik, di luar subnet -> unassigned', () => {
    const g = groupClients(clients, subnets, new Map())
    const s3 = g.subnets.find(s => s.cidr === '10.10.3.0/24')!
    expect(s3.clients.map(c => c.ip)).toEqual(['10.10.3.9', '10.10.3.10', '10.10.3.68', '10.10.3.70', '10.10.3.80'])
    expect(s3.online).toBe(4)
    expect(g.unassigned.map(c => c.ip)).toEqual(['172.16.5.5'])
  })
  it('subnet paling spesifik dipilih', () => {
    const rows: RosRow[] = [{ address: '10.0.0.1/8', interface: 'a' }, { address: '10.5.0.1/16', interface: 'b' }]
    const defs = buildSubnetDefs(rows, new Map<string, InterfaceRole>())
    const g = groupClients(buildClients({
      arp: [{ address: '10.5.1.1', 'mac-address': 'AA', interface: 'b', complete: 'true' }], leases: [], addressList: [],
      subnets: defs, routerIps: routerIpSet(rows), roleByInterface: new Map(),
    }), defs, new Map())
    expect(g.subnets.find(s => s.cidr === '10.5.0.0/16')!.total).toBe(1)
    expect(g.subnets.find(s => s.cidr === '10.0.0.0/8')!.total).toBe(0)
  })
})

describe('pagar read-only', () => {
  it('mengizinkan print dan monitor-traffic', () => {
    for (const p of ['/interface/print', '/ip/dhcp-server/lease/print', '/interface/monitor-traffic']) expect(() => assertReadOnlyPath(p)).not.toThrow()
  })
  it('menolak selain itu', () => {
    for (const p of ['/ip/firewall/address-list/add', '/system/reboot', '/user/set', '/interface/monitor-traffic/x', 'print', '']) expect(() => assertReadOnlyPath(p)).toThrow()
  })
})

describe('audit: tidak ada kemampuan write', () => {
  const dir = new URL('../server/utils/mikrotik/', import.meta.url)
  const files = ['client.ts', 'service.ts', 'logic.ts', 'guard.ts', 'mock.ts']
  const src = (f: string) => readFileSync(new URL(f, dir), 'utf8')
  it('tidak ada path perintah mutasi di kode', () => {
    const verbs = /['"`]\/[a-z0-9\-/]*\/(add|set|remove|enable|disable|move|unset|reset|reboot|shutdown|import|export|run|comment|edit|make-static)['"`]/i
    for (const f of files) expect(src(f), f).not.toMatch(verbs)
  })
  it('client.ts hanya mengekspor fungsi baca; conn.write hanya setelah guard', () => {
    const c = src('client.ts')
    expect([...c.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]).sort()).toEqual(['isMockMode', 'rosRead'])
    expect(c.indexOf('assertReadOnlyPath(path)')).toBeGreaterThan(-1)
    expect(c.indexOf('assertReadOnlyPath(path)')).toBeLessThan(c.indexOf('.write('))
    expect(c.match(/\.write\(/g)).toHaveLength(1)
  })
})

describe('nextWanTransitions', () => {
  const down = (name: string) => ({ name, comment: '', up: false })
  const up = (name: string) => ({ name, comment: '', up: true })

  it('down dilaporkan langsung pada poll pertama (default)', () => {
    const r = nextWanTransitions(new Map(), [down('ether1')], new Set())
    expect(r.wentDown.map(w => w.name)).toEqual(['ether1'])
  })
  it('dengan threshold 2: baru dilaporkan setelah 2 poll berturut-turut (debounce)', () => {
    const first = nextWanTransitions(new Map(), [down('ether1')], new Set(), 2)
    expect(first.wentDown).toHaveLength(0)
    const second = nextWanTransitions(first.streaks, [down('ether1')], new Set(), 2)
    expect(second.wentDown.map(w => w.name)).toEqual(['ether1'])
  })
  it('dengan threshold 2: flapping sesaat tidak memicu down', () => {
    const a = nextWanTransitions(new Map(), [down('ether1')], new Set(), 2)
    const b = nextWanTransitions(a.streaks, [up('ether1')], new Set(), 2)
    const c = nextWanTransitions(b.streaks, [down('ether1')], new Set(), 2)
    expect(c.wentDown).toHaveLength(0)
  })
  it('tidak melaporkan ulang bila event masih terbuka', () => {
    const r = nextWanTransitions(new Map([['ether1', 5]]), [down('ether1')], new Set(['ether1']))
    expect(r.wentDown).toHaveLength(0)
    expect(r.recovered).toHaveLength(0)
  })
  it('pulih saat running lagi', () => {
    const r = nextWanTransitions(new Map([['ether1', 5]]), [up('ether1')], new Set(['ether1']))
    expect(r.recovered).toEqual(['ether1'])
    expect(r.streaks.get('ether1')).toBe(0)
  })
  it('interface hilang/di-disable dari daftar WAN dianggap pulih (event tidak menggantung)', () => {
    const r = nextWanTransitions(new Map(), [up('ether2')], new Set(['ether1']))
    expect(r.recovered).toEqual(['ether1'])
  })
})

describe('aggregateClientRates', () => {
  it('menjumlahkan rate koneksi per IP klien (orig = upload, repl = download)', () => {
    const m = aggregateClientRates([
      { 'src-address': '10.10.4.4:51000', 'orig-rate': '1000', 'repl-rate': '5000' },
      { 'src-address': '10.10.4.4:51001', 'orig-rate': '500', 'repl-rate': '2500' },
      { 'src-address': '10.10.4.5:40000', 'orig-rate': '10', 'repl-rate': '20' },
    ])
    expect(m.get('10.10.4.4')).toEqual({ txBps: 1500, rxBps: 7500 })
    expect(m.get('10.10.4.5')).toEqual({ txBps: 10, rxBps: 20 })
  })
  it('mengabaikan non-IPv4 dan memperlakukan nilai kosong/NaN sebagai 0', () => {
    const m = aggregateClientRates([
      { 'src-address': 'fe80::1', 'orig-rate': '1', 'repl-rate': '1' },
      { 'src-address': '', 'orig-rate': '1' },
      { 'src-address': '10.10.4.9:1', 'orig-rate': 'abc' },
    ])
    expect(m.size).toBe(1)
    expect(m.get('10.10.4.9')).toEqual({ txBps: 0, rxBps: 0 })
  })
})

// Logika murni modul Jaringan MikroTik (tanpa I/O) supaya bisa di-unit-test.
// Semua input berupa baris mentah RouterOS API (nilai selalu string).

export type InterfaceRole = 'WAN' | 'LAN' | 'LAINNYA'
export type RosRow = Record<string, string | undefined>

export interface InterfaceView {
  id: string; name: string; comment: string; type: string; role: InterfaceRole
  running: boolean; disabled: boolean; addresses: string[]
  rxBps: number | null; txBps: number | null
  rxBytes: number | null; txBytes: number | null
  linkDowns: number | null; lastLinkUp: string | null
}

export interface ClientView {
  ip: string; mac: string; hostname: string; interface: string
  online: boolean
  sources: Array<'arp' | 'dhcp'>
  dhcpStatus: string | null; dhcpStatic: boolean | null; dhcpServer: string | null
  lastSeen: string | null; comment: string
  jalur: string
  jalurList: string | null
  jalurConflict: string[]
}

export interface SubnetView {
  cidr: string; interface: string; interfaceComment: string; routerAddress: string
  clients: ClientView[]; online: number; total: number
}

// Urutan rule mangle di router (atas -> bawah). Semua rule passthrough=yes, jadi kalau satu IP
// ada di beberapa list, list yang rule-nya PALING BAWAH yang berlaku.
// HARUS disesuaikan kalau urutan mangle di router berubah.
export const VIA_LISTS = [
  'VIA INDIHOME',
  'VIA BIZNET',
  'VIA BIZNET DEDICATED 60 MBPS',
  'VIA BIZNET LC',
  'VIA MAXINDO',
  'VIA XL SATU',
] as const

export const JALUR_UTAMA = 'YESNET (utama)'

// ---------- IPv4 ----------

export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (!m) return null
  let n = 0
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i])
    if (o > 255) return null
    n = n * 256 + o
  }
  return n
}

export function intToIp(n: number): string {
  return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255].join('.')
}

export function isIPv4(ip: string | undefined): ip is string {
  return !!ip && ipToInt(ip) !== null
}

function prefixMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

export interface Cidr { network: number; prefix: number; cidr: string; first: number; last: number }

/** "10.10.4.7/24" -> network 10.10.4.0/24. Network dihitung ulang dari prefix. */
export function parseCidr(input: string | undefined): Cidr | null {
  if (!input) return null
  const m = /^([\d.]+)\/(\d{1,2})$/.exec(input.trim())
  if (!m) return null
  const ip = ipToInt(m[1])
  const prefix = Number(m[2])
  if (ip === null || prefix > 32) return null
  const mask = prefixMask(prefix)
  const network = (ip & mask) >>> 0
  const last = (network | (~mask >>> 0)) >>> 0
  return { network, prefix, cidr: `${intToIp(network)}/${prefix}`, first: network, last }
}

export interface IpRange { first: number; last: number }

/** Entri address-list: IP tunggal, CIDR, atau range "a-b". Domain/invalid -> null. */
export function parseAddressEntry(address: string | undefined): IpRange | null {
  if (!address) return null
  const a = address.trim()
  if (a.includes('/')) {
    const c = parseCidr(a)
    return c ? { first: c.first, last: c.last } : null
  }
  if (a.includes('-')) {
    const [s, e] = a.split('-')
    const first = ipToInt(s ?? ''), last = ipToInt(e ?? '')
    if (first === null || last === null || first > last) return null
    return { first, last }
  }
  const ip = ipToInt(a)
  return ip === null ? null : { first: ip, last: ip }
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
}

// ---------- Peran interface ----------

export function interfaceRole(
  iface: RosRow,
  wanMembers: Set<string>,
  hasActiveIp: boolean,
): InterfaceRole {
  const comment = (iface.comment || '').trim()
  if (wanMembers.has(iface.name || '') || /^wan/i.test(comment)) return 'WAN'
  if (/^lan/i.test(comment) || hasActiveIp) return 'LAN'
  return 'LAINNYA'
}

/** Anggota interface list "WAN" (list-nya mungkin belum ada di router). */
export function wanMemberSet(members: RosRow[]): Set<string> {
  const s = new Set<string>()
  for (const m of members) if (m.list === 'WAN' && m.interface && m.disabled !== 'true') s.add(m.interface)
  return s
}

export function activeAddressesByInterface(addresses: RosRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const a of addresses) {
    if (a.disabled === 'true' || !a.interface || !a.address) continue
    const list = map.get(a.interface) || []
    list.push(a.address)
    map.set(a.interface, list)
  }
  return map
}

// ---------- Subnet LAN ----------

export interface SubnetDef { cidr: Cidr; interface: string; routerAddress: string }

export function buildSubnetDefs(addresses: RosRow[], roleByInterface: Map<string, InterfaceRole>): SubnetDef[] {
  const seen = new Set<string>()
  const out: SubnetDef[] = []
  for (const a of addresses) {
    if (a.disabled === 'true' || !a.interface || !a.address) continue
    if (roleByInterface.get(a.interface) === 'WAN') continue
    const cidr = parseCidr(a.address)
    if (!cidr || seen.has(cidr.cidr)) continue
    seen.add(cidr.cidr)
    out.push({ cidr, interface: a.interface, routerAddress: a.address.split('/')[0] })
  }
  return out.sort((x, y) => x.cidr.network - y.cidr.network || x.cidr.prefix - y.cidr.prefix)
}

/** Semua IP milik router (bagian IP dari setiap address, termasuk WAN). */
export function routerIpSet(addresses: RosRow[]): Set<string> {
  const s = new Set<string>()
  for (const a of addresses) if (a.address) s.add(a.address.split('/')[0])
  return s
}

/** Subnet paling spesifik (prefix terbesar) yang memuat IP. */
export function findSubnet(ip: string, subnets: SubnetDef[]): SubnetDef | null {
  const n = ipToInt(ip)
  if (n === null) return null
  let best: SubnetDef | null = null
  for (const s of subnets) {
    if (n >= s.cidr.first && n <= s.cidr.last && (!best || s.cidr.prefix > best.cidr.prefix)) best = s
  }
  return best
}

// ---------- Jalur internet ----------

export interface ViaEntry { list: string; range: IpRange }

export function buildViaEntries(addressList: RosRow[]): ViaEntry[] {
  const out: ViaEntry[] = []
  for (const e of addressList) {
    if (e.disabled === 'true' || !e.list || !(VIA_LISTS as readonly string[]).includes(e.list)) continue
    const range = parseAddressEntry(e.address)
    if (range) out.push({ list: e.list, range })
  }
  return out
}

export function resolveJalur(ip: string, via: ViaEntry[]): Pick<ClientView, 'jalur' | 'jalurList' | 'jalurConflict'> {
  const n = ipToInt(ip)
  const matched = new Set<string>()
  if (n !== null) for (const v of via) if (n >= v.range.first && n <= v.range.last) matched.add(v.list)
  // urutan sesuai mangle (atas -> bawah); yang terakhir menang
  const ordered = VIA_LISTS.filter(l => matched.has(l))
  if (!ordered.length) return { jalur: JALUR_UTAMA, jalurList: null, jalurConflict: [] }
  const winner = ordered[ordered.length - 1]
  return { jalur: winner, jalurList: winner, jalurConflict: ordered.length > 1 ? [...ordered] : [] }
}

// ---------- Klien (ARP + DHCP) ----------

export interface ClientInputs {
  arp: RosRow[]
  leases: RosRow[]
  addressList: RosRow[]
  subnets: SubnetDef[]
  routerIps: Set<string>
  roleByInterface: Map<string, InterfaceRole>
}

export function buildClients(inp: ClientInputs): ClientView[] {
  const via = buildViaEntries(inp.addressList)
  const byIp = new Map<string, ClientView>()

  for (const a of inp.arp) {
    if (a.invalid === 'true' || !a['mac-address'] || !isIPv4(a.address)) continue
    if (inp.roleByInterface.get(a.interface || '') === 'WAN') continue
    if (inp.routerIps.has(a.address)) continue
    byIp.set(a.address, {
      ip: a.address, mac: a['mac-address']!, hostname: '', interface: a.interface || '',
      online: a.complete === undefined ? true : a.complete === 'true',
      sources: ['arp'], dhcpStatus: null, dhcpStatic: null, dhcpServer: null,
      lastSeen: null, comment: a.comment || '',
      jalur: '', jalurList: null, jalurConflict: [],
    })
  }

  for (const l of inp.leases) {
    if (l.disabled === 'true') continue
    const ip = l['active-address'] || l.address
    if (!isIPv4(ip) || inp.routerIps.has(ip)) continue
    let c = byIp.get(ip)
    if (!c) {
      c = {
        ip, mac: l['active-mac-address'] || l['mac-address'] || '', hostname: '', interface: '',
        online: false, sources: [], dhcpStatus: null, dhcpStatic: null, dhcpServer: null,
        lastSeen: null, comment: '', jalur: '', jalurList: null, jalurConflict: [],
      }
      byIp.set(ip, c)
    }
    c.sources.push('dhcp')
    if (!c.mac) c.mac = l['active-mac-address'] || l['mac-address'] || ''
    c.hostname = l['host-name'] || c.hostname
    c.dhcpStatus = l.status || null
    c.dhcpStatic = l.dynamic !== 'true'
    c.dhcpServer = l.server || null
    c.lastSeen = l['last-seen'] || null
    if (l.comment) c.comment = l.comment
  }

  const out: ClientView[] = []
  for (const c of byIp.values()) {
    if (!c.interface) c.interface = findSubnet(c.ip, inp.subnets)?.interface || ''
    Object.assign(c, resolveJalur(c.ip, via))
    out.push(c)
  }
  return out
}

export function groupClients(clients: ClientView[], subnets: SubnetDef[], commentByInterface: Map<string, string>) {
  const views = new Map<string, SubnetView>()
  for (const s of subnets) {
    views.set(s.cidr.cidr, {
      cidr: s.cidr.cidr, interface: s.interface,
      interfaceComment: commentByInterface.get(s.interface) || '',
      routerAddress: s.routerAddress, clients: [], online: 0, total: 0,
    })
  }
  const unassigned: ClientView[] = []
  for (const c of clients) {
    const s = findSubnet(c.ip, subnets)
    if (!s) { unassigned.push(c); continue }
    const v = views.get(s.cidr.cidr)!
    v.clients.push(c)
    v.total++
    if (c.online) v.online++
  }
  const byIp = (a: ClientView, b: ClientView) => (ipToInt(a.ip) ?? 0) - (ipToInt(b.ip) ?? 0)
  for (const v of views.values()) v.clients.sort(byIp)
  unassigned.sort(byIp)
  return { subnets: [...views.values()], unassigned }
}

export function summarize(clients: ClientView[]) {
  const perJalur: Record<string, number> = {}
  let online = 0
  for (const c of clients) {
    if (c.online) online++
    perJalur[c.jalur] = (perJalur[c.jalur] || 0) + 1
  }
  return { total: clients.length, online, perJalur }
}

// ---------- Interface view ----------

export function buildInterfaceViews(
  interfaces: RosRow[],
  addresses: RosRow[],
  wanMembers: Set<string>,
  traffic: Map<string, { rx: number; tx: number }>,
): InterfaceView[] {
  const addrMap = activeAddressesByInterface(addresses)
  const num = (v: string | undefined) => (v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v))
  const views = interfaces.map((i): InterfaceView => {
    const name = i.name || ''
    const addrs = addrMap.get(name) || []
    const running = i.running === 'true'
    const disabled = i.disabled === 'true'
    const t = traffic.get(name)
    return {
      id: i['.id'] || name, name, comment: i.comment || '', type: i.type || '',
      role: interfaceRole(i, wanMembers, addrs.length > 0),
      running, disabled, addresses: addrs,
      rxBps: running && !disabled ? (t?.rx ?? null) : null,
      txBps: running && !disabled ? (t?.tx ?? null) : null,
      rxBytes: num(i['rx-byte']), txBytes: num(i['tx-byte']),
      linkDowns: num(i['link-downs']), lastLinkUp: i['last-link-up-time'] || null,
    }
  })
  const order: Record<InterfaceRole, number> = { WAN: 0, LAN: 1, LAINNYA: 2 }
  return views.sort((a, b) => order[a.role] - order[b.role] || naturalCompare(a.name, b.name))
}

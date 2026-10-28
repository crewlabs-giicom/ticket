import type { RosRow } from './logic'

// Data contoh (IP fiktif) untuk NUXT_ROUTEROS_MOCK=true. Router tidak dihubungi.

const IFACES: Array<[string, string, boolean, boolean]> = [
  // name, comment, running, disabled
  ['ether1', 'WAN to RO Yesnet (jalur utama)', true, false],
  ['ether2', '', false, false],
  ['ether3', 'LAN ALL Ruko - via Biznet 350 Mbps', true, false],
  ['ether4', 'WAN XL SATU - 300Mbps', true, false],
  ['ether5', '', false, false],
  ['ether6', 'LAN Ruko G H (IP 96)', true, false],
  ['ether7', 'WAN BIZNET - 60 Mbps Dedicated', true, false],
  ['ether8', 'WAN BIZNET - LC', true, false],
  ['ether9', 'WAN BIZNET - 350 Mbps Up To', true, false],
  ['ether10', 'WAN INDIHOME', false, false],
  ['ether11', 'LAN Ruko E F (IP 4)', true, false],
  ['ether12', 'TIDAK BISA DIPAKAI', false, true],
]

const ADDRESSES: Array<[string, string]> = [
  ['103.209.250.18/29', 'ether1'], ['10.10.3.1/24', 'ether3'], ['192.168.0.2/24', 'ether4'],
  ['10.10.96.1/24', 'ether6'], ['192.168.12.2/24', 'ether7'], ['192.168.20.2/24', 'ether8'],
  ['192.168.18.2/24', 'ether9'], ['192.168.100.2/24', 'ether10'],
  ['10.10.4.1/24', 'ether11'], ['10.10.10.1/24', 'ether11'],
]

const WAN_PORTS = ['ether1', 'ether4', 'ether7', 'ether8', 'ether9', 'ether10']

// ip, mac, hostname, iface, inArp, lease, online
const CLIENTS: Array<[string, string, string, string, boolean, 'static' | 'dynamic' | null, boolean]> = [
  ['10.10.3.9', 'AA:BB:CC:00:03:09', 'PC-KASIR-01', 'ether3', true, 'static', true],
  ['10.10.3.10', 'AA:BB:CC:00:03:10', 'LAPTOP-ADMIN', 'ether3', true, 'dynamic', true],
  ['10.10.3.68', 'AA:BB:CC:00:03:68', 'HP-RIZKI', 'ether3', true, 'dynamic', true],
  ['10.10.3.70', 'AA:BB:CC:00:03:70', '', 'ether3', true, null, true],
  ['10.10.3.80', 'AA:BB:CC:00:03:80', 'TAB-GUDANG', 'ether3', false, 'static', false],
  ['10.10.96.5', 'AA:BB:CC:00:96:05', '', 'ether6', true, null, true],
  ['10.10.96.12', 'AA:BB:CC:00:96:12', 'LAPTOP-HR', 'ether6', true, 'dynamic', true],
  ['10.10.96.30', 'AA:BB:CC:00:96:30', 'PC-TOKO', 'ether6', true, 'dynamic', true],
  ['10.10.96.40', 'AA:BB:CC:00:96:40', 'HP-TAMU', 'ether6', false, 'dynamic', false],
  ['10.10.4.20', 'AA:BB:CC:00:04:20', 'PC-GUDANG', 'ether11', true, 'static', true],
  ['10.10.4.50', 'AA:BB:CC:00:04:50', 'LAPTOP-AUDIT', 'ether11', false, 'dynamic', false],
  ['10.10.10.15', 'AA:BB:CC:00:10:15', 'AP-LANTAI2', 'ether11', true, null, true],
  ['172.16.5.5', 'AA:BB:CC:00:05:05', '', 'ether6', true, null, true], // di luar subnet LAN
]

const ADDRESS_LIST: Array<[string, string, boolean]> = [
  ['VIA BIZNET', '10.10.3.0/24', false],
  ['VIA INDIHOME', '10.10.3.68', false], // konflik dengan VIA BIZNET -> VIA BIZNET menang
  ['VIA XL SATU', '10.10.96.10-10.10.96.20', false],
  ['VIA BIZNET LC', '10.10.4.20', false],
  ['VIA MAXINDO', '10.10.4.50', true], // disabled -> diabaikan
  ['VIA BIZNET', 'contoh-domain.com', false], // domain -> diabaikan
  ['ALL LAN', '10.10.0.0/16', false], // bukan list jalur
  ['tiktok', 'www.tiktok.com', false],
]

function trafficRow(name: string): RosRow {
  const wave = 0.6 + 0.4 * Math.sin(Date.now() / 4000 + name.length)
  const rx = Math.round((5 + Math.random() * 60) * 1e6 * wave)
  const tx = Math.round((1 + Math.random() * 15) * 1e6 * wave)
  return { name, 'rx-bits-per-second': String(rx), 'tx-bits-per-second': String(tx) }
}

export function mockRead(path: string, params: string[] = []): RosRow[] {
  switch (path) {
    case '/interface/print':
      return IFACES.map(([name, comment, running, disabled], i) => ({
        '.id': `*${(i + 1).toString(16).toUpperCase()}`, name, type: 'ether', comment,
        running: String(running), disabled: String(disabled),
        'rx-byte': String(1e9 + i * 123456789), 'tx-byte': String(5e8 + i * 98765432),
        'link-downs': String(i % 4), ...(running ? { 'last-link-up-time': 'jan/05/2026 08:12:44' } : {}),
      }))
    case '/interface/list/member/print':
      return WAN_PORTS.map((iface, i) => ({ '.id': `*M${i}`, list: 'WAN', interface: iface, disabled: 'false' }))
    case '/ip/address/print':
      return ADDRESSES.map(([address, iface], i) => ({ '.id': `*A${i}`, address, interface: iface, disabled: 'false' }))
    case '/interface/monitor-traffic': {
      const names = (params.find(p => p.startsWith('=interface=')) || '').replace('=interface=', '').split(',').filter(Boolean)
      return names.map(trafficRow)
    }
    case '/ip/arp/print': {
      const out: RosRow[] = CLIENTS.filter(c => c[4]).map(([address, mac, , iface], i) => ({
        '.id': `*R${i}`, address, 'mac-address': mac, interface: iface, complete: 'true', invalid: 'false',
      }))
      // modem ISP di port WAN -> harus dikecualikan dari daftar klien
      out.push({ '.id': '*RW', address: '103.209.250.17', 'mac-address': 'AA:BB:CC:FF:00:01', interface: 'ether1', complete: 'true', invalid: 'false' })
      return out
    }
    case '/ip/dhcp-server/lease/print':
      return CLIENTS.filter(c => c[5]).map(([address, mac, host, , , kind, online], i) => ({
        '.id': `*L${i}`, address, 'mac-address': mac, 'host-name': host,
        status: online ? 'bound' : 'waiting', dynamic: String(kind === 'dynamic'),
        server: 'dhcp-lan', 'last-seen': online ? '12s' : '2d3h', disabled: 'false',
        ...(online ? { 'active-address': address, 'active-mac-address': mac } : {}),
      }))
    case '/ip/firewall/address-list/print':
      return ADDRESS_LIST.map(([list, address, disabled], i) => ({ '.id': `*F${i}`, list, address, disabled: String(disabled) }))
    default:
      return []
  }
}

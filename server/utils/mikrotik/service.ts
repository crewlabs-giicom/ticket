import { rosRead, rosPing, isMockMode } from './client'
import { summarizePing, pickRepresentative, classifyQuality, type PingSummary } from './analytics'
import { pingConfig } from './pingConfig'
import { setPingDiag, type PingDiagTarget } from './pingDiag'
import {
  activeAddressesByInterface, aggregateClientRates, buildClients, buildInterfaceViews, buildSubnetDefs, groupClients,
  interfaceRole, resolveWanPing, routerIpSet, summarize, wanMemberSet,
  type InterfaceRole, type RosRow, type WanPingSetup, type WanState,
} from './logic'

async function loadInterfaceBase() {
  const [interfaces, addresses, members] = await Promise.all([
    rosRead('/interface/print'),
    rosRead('/ip/address/print'),
    rosRead('/interface/list/member/print'),
  ])
  const wan = wanMemberSet(members)
  const addrMap = activeAddressesByInterface(addresses)
  const roleByInterface = new Map<string, InterfaceRole>()
  for (const i of interfaces) roleByInterface.set(i.name || '', interfaceRole(i, wan, (addrMap.get(i.name || '') || []).length > 0))
  return { interfaces, addresses, wan, roleByInterface }
}

async function fetchTraffic(interfaces: RosRow[]) {
  const active = interfaces.filter(i => i.running === 'true' && i.disabled !== 'true').map(i => i.name!)
  const traffic = new Map<string, { rx: number; tx: number }>()
  if (active.length) {
    // satu panggilan untuk semua interface yang running
    const rows: RosRow[] = await rosRead('/interface/monitor-traffic', [`=interface=${active.join(',')}`, '=once='])
    for (const r of rows) {
      if (r.name) traffic.set(r.name, { rx: Number(r['rx-bits-per-second']) || 0, tx: Number(r['tx-bits-per-second']) || 0 })
    }
  }
  return traffic
}

/** Hanya bandwidth live (ringan): dipoll ~1 dtk oleh grafik. */
export async function getTraffic() {
  const interfaces = await rosRead('/interface/print')
  const traffic = await fetchTraffic(interfaces)
  return {
    fetchedAt: new Date().toISOString(), mock: isMockMode(),
    traffic: [...traffic].map(([name, v]) => ({ name, rxBps: v.rx, txBps: v.tx })),
  }
}

/** Kecepatan per IP klien (Mbps di UI) dari rate connection tracking; koneksi FastTrack tidak terhitung. */
export async function getClientRates() {
  const conns = await rosRead('/ip/firewall/connection/print', ['=.proplist=src-address,orig-rate,repl-rate'])
  return {
    fetchedAt: new Date().toISOString(), mock: isMockMode(),
    rates: [...aggregateClientRates(conns)].map(([ip, v]) => ({ ip, rxBps: v.rxBps, txBps: v.txBps })),
  }
}

/** Status interface WAN yang tidak di-disable (dipakai detector WAN down). */
export async function getWanStatus(): Promise<WanState[]> {
  const { interfaces, roleByInterface } = await loadInterfaceBase()
  return interfaces
    .filter(i => roleByInterface.get(i.name || '') === 'WAN' && i.disabled !== 'true')
    .map(i => ({ name: i.name || '', comment: i.comment || '', up: i.running === 'true' }))
}

export interface WanPingEntry { name: string; comment: string; up: boolean; setup: WanPingSetup | null }

// RouterOS 7 = /routing/rule, 6 = /ip/route/rule; yang tidak ada di versi router diabaikan.
async function readRules(): Promise<RosRow[]> {
  for (const path of ['/routing/rule/print', '/ip/route/rule/print']) {
    try { return await rosRead(path) } catch { /* path tidak dikenal di versi ini */ }
  }
  return []
}

/** WAN aktif beserta setting ping-nya (IP sumber + routing table) yang dibaca dari konfigurasi router. setup=null: tidak bisa diukur. */
export async function getWanPingSetups(): Promise<WanPingEntry[]> {
  const { interfaces, addresses, roleByInterface } = await loadInterfaceBase()
  const [routes, rules] = await Promise.all([rosRead('/ip/route/print'), readRules()])
  return interfaces
    .filter(i => roleByInterface.get(i.name || '') === 'WAN' && i.disabled !== 'true')
    .map(i => ({
      name: i.name || '', comment: i.comment || '', up: i.running === 'true',
      setup: resolveWanPing(i.name || '', addresses, routes, rules),
    }))
}

export interface WanProbe { name: string; targets: Array<PingSummary & { target: string }> }

/** Ping satu WAN ke semua target (berurutan, agar koneksi API bersama tidak terbebani). Target yang error dilewati. */
export async function probeWan(setup: WanPingSetup): Promise<WanProbe> {
  const { targets, count } = pingConfig()
  const out: WanProbe['targets'] = []
  const diag: PingDiagTarget[] = []
  for (const target of targets) {
    try {
      const rows = await rosPing(setup.name, { target, srcAddress: setup.srcAddress, routingTable: setup.routingTable, count })
      diag.push({ target, error: null, rows: rows.length, raw: JSON.stringify(rows.slice(0, 2)).slice(0, 240) })
      out.push({ target, ...summarizePing(rows, count) })
    } catch (e: any) {
      if (e?.statusCode === 502) { setPingDiag(setup.name, diag); throw e } // router tidak terjangkau: hentikan siklus, bukan "WAN jelek"
      // ditolak router / parameter tidak valid: lewati target ini, tapi catat supaya tidak diam-diam
      diag.push({ target, error: String(e?.message || e), rows: 0, raw: '' })
      console.error(`[Ping] ${setup.name} -> ${target} dilewati:`, e?.message || e)
    }
  }
  setPingDiag(setup.name, diag)
  return { name: setup.name, targets: out }
}

/** Status kualitas per WAN (target terbaik sebagai wakil) dari satu hasil probe. */
export function wanQuality(probe: WanProbe) {
  const rep = pickRepresentative(probe.targets)
  if (!rep) return null
  return { ...rep, ...classifyQuality(rep, pingConfig().thresholds) }
}

export async function getInterfaces() {
  const { interfaces, addresses, wan } = await loadInterfaceBase()
  const traffic = await fetchTraffic(interfaces)
  return {
    fetchedAt: new Date().toISOString(), mock: isMockMode(),
    interfaces: buildInterfaceViews(interfaces, addresses, wan, traffic),
  }
}

export async function getClients() {
  const [base, arp, leases, addressList] = await Promise.all([
    loadInterfaceBase(),
    rosRead('/ip/arp/print'),
    rosRead('/ip/dhcp-server/lease/print'),
    rosRead('/ip/firewall/address-list/print'),
  ])
  const subnets = buildSubnetDefs(base.addresses, base.roleByInterface)
  const clients = buildClients({
    arp, leases, addressList, subnets,
    routerIps: routerIpSet(base.addresses), roleByInterface: base.roleByInterface,
  })
  const commentByInterface = new Map(base.interfaces.map(i => [i.name || '', i.comment || '']))
  const grouped = groupClients(clients, subnets, commentByInterface)
  return {
    fetchedAt: new Date().toISOString(), mock: isMockMode(),
    subnets: grouped.subnets, unassigned: grouped.unassigned, summary: summarize(clients),
  }
}

import { rosRead, isMockMode } from './client'
import {
  activeAddressesByInterface, buildClients, buildInterfaceViews, buildSubnetDefs, groupClients,
  interfaceRole, routerIpSet, summarize, wanMemberSet, type InterfaceRole, type RosRow,
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

import { getDb } from '../database/index'
import { isMockMode } from '../utils/mikrotik/client'
import { getInterfaces, getClients, getClientRates } from '../utils/mikrotik/service'
import { findSubnet, parseCidr, type SubnetDef } from '../utils/mikrotik/logic'

const SAMPLE_MS = 60 * 1000
const RETENTION_DAYS = 30
const PURGE_MS = 6 * 3600 * 1000

// Simpan sampel interface & subnet tiap menit untuk halaman Analitik Jaringan.
// Router tidak terjangkau / mock mode: dilewati (tidak ada sampel palsu).
export default defineNitroPlugin(() => {
  let running = false

  async function tick() {
    if (running) return
    running = true
    try {
      if (isMockMode()) return
      let ifaces, clients, rates
      try {
        ;[ifaces, clients, rates] = await Promise.all([getInterfaces(), getClients(), getClientRates()])
      } catch {
        return
      }
      const db = getDb()

      const ifaceRows = ifaces.interfaces.filter(i => !i.disabled)
      if (ifaceRows.length) {
        const ph = ifaceRows.map(() => '(NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',')
        const args = ifaceRows.flatMap(i => [
          i.name, Math.round(i.rxBps ?? 0), Math.round(i.txBps ?? 0), i.rxBytes, i.txBytes,
          i.rxErrors, i.txErrors, i.rxDrops, i.txDrops, i.linkDowns, i.running ? 1 : 0,
        ])
        await db.execute(
          `INSERT INTO net_iface_samples (ts, interface_name, rx_bps, tx_bps, rx_bytes, tx_bytes, rx_errors, tx_errors, rx_drops, tx_drops, link_downs, running) VALUES ${ph}`,
          args
        )
      }

      // rate per subnet = jumlah rate klien (connection tracking) yang IP-nya masuk subnet itu
      const subnetDefs: SubnetDef[] = []
      for (const s of clients.subnets) {
        const cidr = parseCidr(s.cidr)
        if (cidr) subnetDefs.push({ cidr, interface: s.interface, routerAddress: s.routerAddress })
      }
      const perSubnet = new Map<string, { rx: number; tx: number }>()
      for (const r of rates.rates) {
        const s = findSubnet(r.ip, subnetDefs)
        if (!s) continue
        const cur = perSubnet.get(s.cidr.cidr) || { rx: 0, tx: 0 }
        cur.rx += r.rxBps
        cur.tx += r.txBps
        perSubnet.set(s.cidr.cidr, cur)
      }
      if (clients.subnets.length) {
        const ph = clients.subnets.map(() => '(NOW(), ?, ?, ?, ?, ?, ?)').join(',')
        const args = clients.subnets.flatMap(s => {
          const r = perSubnet.get(s.cidr)
          return [s.cidr, s.interface, s.online, s.total, Math.round(r?.rx ?? 0), Math.round(r?.tx ?? 0)]
        })
        await db.execute(
          `INSERT INTO net_subnet_samples (ts, cidr, interface_name, online, total, rx_bps, tx_bps) VALUES ${ph}`,
          args
        )
      }
    } catch (e: any) {
      console.error('[Analytics] sampler error:', e?.message || e)
    } finally {
      running = false
    }
  }

  async function purge() {
    try {
      const db = getDb()
      await db.execute('DELETE FROM net_iface_samples WHERE ts < NOW() - INTERVAL ? DAY', [RETENTION_DAYS])
      await db.execute('DELETE FROM net_subnet_samples WHERE ts < NOW() - INTERVAL ? DAY', [RETENTION_DAYS])
      await db.execute('DELETE FROM net_ping_samples WHERE ts < NOW() - INTERVAL ? DAY', [RETENTION_DAYS])
    } catch (e: any) {
      console.error('[Analytics] purge error:', e?.message || e)
    }
  }

  setTimeout(tick, 15 * 1000)
  setInterval(tick, SAMPLE_MS)
  setTimeout(purge, 60 * 1000)
  setInterval(purge, PURGE_MS)
})

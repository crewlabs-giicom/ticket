// Pagar read-only: hanya perintah baca yang boleh dikirim ke router.
// Fase ini TIDAK menyediakan fungsi write sama sekali.
export function assertReadOnlyPath(path: string): void {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new Error(`Path RouterOS tidak diizinkan: ${String(path)}`)
  }
  if (path === '/interface/monitor-traffic') return
  if (path.endsWith('/print')) return
  throw new Error(`Path RouterOS tidak diizinkan (hanya /print dan /interface/monitor-traffic): ${path}`)
}

const HOST_RE = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const TABLE_RE = /^[A-Za-z0-9_.@ -]{1,64}$/

export interface PingOptions { target: string; srcAddress: string; routingTable?: string | null; count: number }

/**
 * /ping adalah satu-satunya perintah non-print yang diizinkan, dan hanya lewat rosPing dengan parameter
 * tervalidasi (bukan lewat rosRead). Mengembalikan parameter API yang aman dikirim.
 */
export function buildPingParams(o: PingOptions): string[] {
  if (typeof o.target !== 'string' || !HOST_RE.test(o.target)) throw new Error(`Target ping tidak valid: ${String(o.target)}`)
  const m = typeof o.srcAddress === 'string' ? IPV4_RE.exec(o.srcAddress) : null
  if (!m || m.slice(1).some(p => Number(p) > 255)) throw new Error(`IP sumber ping tidak valid: ${String(o.srcAddress)}`)
  if (o.routingTable && !TABLE_RE.test(o.routingTable)) throw new Error(`Routing table ping tidak valid: ${String(o.routingTable)}`)
  if (!Number.isInteger(o.count) || o.count < 1 || o.count > 10) throw new Error(`Jumlah ping tidak valid: ${String(o.count)}`)
  return [
    `=address=${o.target}`, `=src-address=${o.srcAddress}`,
    ...(o.routingTable ? [`=routing-table=${o.routingTable}`] : []),
    `=count=${o.count}`, '=interval=200ms',
  ]
}

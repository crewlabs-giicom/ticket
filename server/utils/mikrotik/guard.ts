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
const IFACE_RE = /^[A-Za-z0-9_.@ -]{1,64}$/

/**
 * /ping adalah satu-satunya perintah non-print yang diizinkan, dan hanya lewat rosPing dengan parameter
 * tervalidasi (bukan lewat rosRead). Mengembalikan parameter API yang aman dikirim.
 */
export function buildPingParams(target: string, iface: string, count: number): string[] {
  if (typeof target !== 'string' || !HOST_RE.test(target)) throw new Error(`Target ping tidak valid: ${String(target)}`)
  if (typeof iface !== 'string' || !IFACE_RE.test(iface)) throw new Error(`Interface ping tidak valid: ${String(iface)}`)
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error(`Jumlah ping tidak valid: ${String(count)}`)
  return [`=address=${target}`, `=interface=${iface}`, `=count=${count}`, '=interval=200ms']
}

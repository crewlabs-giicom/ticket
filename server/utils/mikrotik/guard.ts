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

import { RouterOSAPI } from 'node-routeros'
import { assertReadOnlyPath, buildPingParams, type PingOptions } from './guard'
import { mockRead, mockPing } from './mock'
import type { RosRow } from './logic'

// TTL cache per path (ms). Path yang tidak terdaftar memakai routeros.cacheMs.
const TTL_BY_PATH: Record<string, number> = {
  '/interface/print': 3000,
  '/interface/list/member/print': 60000,
  '/ip/address/print': 60000,
  '/interface/monitor-traffic': 900, // grafik realtime ~1 dtk; admin lain berbagi hasil cache yang sama
  '/ip/route/print': 60000,
  '/routing/rule/print': 60000,
  '/ip/route/rule/print': 60000,
  '/ip/arp/print': 10000,
  '/ip/dhcp-server/lease/print': 10000,
  '/ip/firewall/address-list/print': 10000,
  '/ip/firewall/connection/print': 3000, // rate per koneksi untuk kecepatan per IP
}

interface RosConfig {
  host: string; port: number; user: string; password: string
  tls: boolean; rejectUnauthorized: boolean; cacheMs: number; mock: boolean
}

const bool = (v: unknown, def: boolean) => (v === undefined || v === null || v === '' ? def : String(v) === 'true')

function config(): RosConfig {
  const c: any = useRuntimeConfig().routeros || {}
  return {
    host: String(c.host || ''), port: Number(c.port) || 8729,
    user: String(c.user || ''), password: String(c.password || ''),
    tls: bool(c.tls, true), rejectUnauthorized: bool(c.rejectUnauthorized, false),
    cacheMs: Number(c.cacheMs) || 3000, mock: bool(c.mock, false),
  }
}

export function isMockMode(): boolean { return config().mock }

let api: RouterOSAPI | null = null
let connecting: Promise<RouterOSAPI> | null = null
const cache = new Map<string, { at: number; value: RosRow[] }>()
const inflight = new Map<string, Promise<RosRow[]>>()

const CONNECT_TIMEOUT_MS = 10000

// Paket yang di-drop firewall / TLS handshake macet tidak memicu error; paksa gagal setelah ms.
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>
  const timer = new Promise<never>((_, reject) => { t = setTimeout(() => reject(new Error(msg)), ms) })
  return Promise.race([p, timer]).finally(() => clearTimeout(t))
}

function resetConnection() {
  const old = api
  api = null
  connecting = null
  if (old) old.close().catch(() => {})
}

function connect(cfg: RosConfig): Promise<RouterOSAPI> {
  if (api) return Promise.resolve(api)
  if (connecting) return connecting // cegah dua proses connect bersamaan
  const conn = new RouterOSAPI({
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
    timeout: 10, keepalive: true,
    ...(cfg.tls ? { tls: { rejectUnauthorized: cfg.rejectUnauthorized } } : {}),
  })
  // WAJIB: tanpa listener 'error', error socket membuat proses Node crash.
  conn.on('error', (err: unknown) => {
    console.error('[RouterOS] connection error:', (err as Error)?.message || 'unknown')
    if (api === conn) resetConnection()
  })
  const p: Promise<RouterOSAPI> = withTimeout(conn.connect(), CONNECT_TIMEOUT_MS, 'timeout koneksi (cek port/TLS/firewall)').then(() => {
    api = conn
    connecting = null
    return conn
  }).catch((err) => {
    connecting = null
    conn.close().catch(() => {})
    throw err
  })
  connecting = p
  return p
}

function routerError(err: unknown) {
  const e = err as any
  const msg = e?.message || e?.code || e?.errno || 'koneksi gagal'
  return createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: `Router tidak bisa dibaca: ${msg}` })
}

const PING_TIMEOUT_MS = 8000

/** Ping dari router lewat satu WAN (IP sumber + routing table-nya; satu baris hasil per paket). Tanpa cache; parameter divalidasi guard. */
export async function rosPing(wanName: string, o: PingOptions): Promise<RosRow[]> {
  const params = buildPingParams(o)
  const cfg = config()
  if (cfg.mock) return mockPing(wanName, o.count)
  if (!cfg.host || !cfg.user) {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Router tidak bisa dibaca: NUXT_ROUTEROS_HOST / NUXT_ROUTEROS_USER belum diisi' })
  }
  try {
    const conn = await connect(cfg)
    return (await withTimeout(conn.write('/ping', params), PING_TIMEOUT_MS, 'ping tidak selesai')) as unknown as RosRow[]
  } catch (err) {
    resetConnection()
    throw routerError(err)
  }
}

/** Baca data dari router. Hanya `/…/print` dan `/interface/monitor-traffic`. */
export async function rosRead(path: string, params: string[] = []): Promise<RosRow[]> {
  assertReadOnlyPath(path)
  const cfg = config()
  if (cfg.mock) return mockRead(path, params)
  if (!cfg.host || !cfg.user) {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Router tidak bisa dibaca: NUXT_ROUTEROS_HOST / NUXT_ROUTEROS_USER belum diisi' })
  }

  const key = `${path}|${params.join('|')}`
  const ttl = TTL_BY_PATH[path] ?? cfg.cacheMs
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  const pending = inflight.get(key)
  if (pending) return pending

  const p = (async () => {
    try {
      const conn = await connect(cfg)
      const rows = (await withTimeout(conn.write(path, params), CONNECT_TIMEOUT_MS, 'router tidak merespons')) as unknown as RosRow[]
      cache.set(key, { at: Date.now(), value: rows })
      return rows
    } catch (err) {
      resetConnection()
      throw routerError(err)
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

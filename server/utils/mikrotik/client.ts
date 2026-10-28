import { RouterOSAPI } from 'node-routeros'
import { assertReadOnlyPath } from './guard'
import { mockRead } from './mock'
import type { RosRow } from './logic'

// TTL cache per path (ms). Path yang tidak terdaftar memakai routeros.cacheMs.
const TTL_BY_PATH: Record<string, number> = {
  '/interface/print': 3000,
  '/interface/list/member/print': 60000,
  '/ip/address/print': 60000,
  '/interface/monitor-traffic': 900, // grafik realtime ~1 dtk; admin lain berbagi hasil cache yang sama
  '/ip/arp/print': 10000,
  '/ip/dhcp-server/lease/print': 10000,
  '/ip/firewall/address-list/print': 10000,
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
  const p: Promise<RouterOSAPI> = conn.connect().then(() => {
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
      const rows = (await conn.write(path, params)) as unknown as RosRow[]
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

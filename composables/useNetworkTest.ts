export interface NetworkTestResult {
  download_mbps: number | null
  upload_mbps: number | null
  latency_ms: number | null
  jitter_ms: number | null
  download_jitter_ms: number | null
  upload_jitter_ms: number | null
  packet_loss_pct: number | null
  duration_sec: number
}

type Phase = 'idle' | 'latency' | 'download' | 'upload' | 'done'

const PING_URL = '/api/network-checks/ping'
const PING_TIMEOUT_MS = 2000
const PING_INTERVAL_MS = 200
const LOAD_SECONDS = 8
const PARALLEL = 3

const round = (n: number) => Math.round(n * 100) / 100

/** rata-rata, jitter (rata-rata selisih antar ping berurutan), dan packet loss dari sampel ping */
function summarize(samples: number[], lost: number) {
  const total = samples.length + lost
  const mean = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null
  let jitter: number | null = null
  if (samples.length > 1) {
    let sum = 0
    for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1])
    jitter = sum / (samples.length - 1)
  }
  return {
    latency: mean === null ? null : round(mean),
    jitter: jitter === null ? null : round(jitter),
    loss: total ? round((lost / total) * 100) : null,
  }
}

/**
 * Tes jaringan dari browser: latency/jitter/packet loss (idle), lalu download dan upload
 * dengan ping paralel agar jitter saat jaringan dibebani ikut terukur.
 */
export function useNetworkTest() {
  const running = ref(false)
  const phase = ref<Phase>('idle')
  const progress = ref(0)
  const liveMbps = ref<number | null>(null)
  const result = ref<NetworkTestResult | null>(null)
  const error = ref<string | null>(null)
  let abortCtl: AbortController | null = null

  async function pingOnce(signal: AbortSignal): Promise<number | null> {
    const t0 = performance.now()
    try {
      const res = await fetch(`${PING_URL}?_=${Math.random()}`, {
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(PING_TIMEOUT_MS)]),
      })
      if (!res.ok) return null
      await res.arrayBuffer()
      return performance.now() - t0
    } catch {
      return null
    }
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  /** ping berulang sampai `until()` true; mengembalikan sampel dan jumlah gagal */
  async function pingLoop(signal: AbortSignal, until: () => boolean, onTick?: (n: number) => void) {
    const samples: number[] = []
    let lost = 0
    while (!until() && !signal.aborted) {
      const ms = await pingOnce(signal)
      if (ms === null) lost++
      else samples.push(ms)
      onTick?.(samples.length + lost)
      await sleep(PING_INTERVAL_MS)
    }
    return summarize(samples, lost)
  }

  async function downloadWorker(signal: AbortSignal, stats: { bytes: number }, deadline: number) {
    while (performance.now() < deadline && !signal.aborted) {
      try {
        const res = await fetch(`/api/network-checks/download?mb=10&_=${Math.random()}`, { cache: 'no-store', signal })
        const reader = res.body?.getReader()
        if (!reader) return
        while (performance.now() < deadline) {
          const { done, value } = await reader.read()
          if (done) break
          stats.bytes += value.byteLength
        }
        await reader.cancel().catch(() => {})
      } catch {
        return
      }
    }
  }

  async function uploadWorker(signal: AbortSignal, stats: { bytes: number }, deadline: number) {
    const payload = new Blob([new Uint8Array(2 * 1024 * 1024)])
    while (performance.now() < deadline && !signal.aborted) {
      try {
        const res = await fetch('/api/network-checks/upload', { method: 'POST', body: payload, cache: 'no-store', signal })
        if (!res.ok) return
        stats.bytes += payload.size
      } catch {
        return
      }
    }
  }

  /** jalankan satu fase beban (download/upload) sambil mengukur ping paralel */
  async function loadPhase(signal: AbortSignal, worker: typeof downloadWorker) {
    const stats = { bytes: 0 }
    const start = performance.now()
    const deadline = start + LOAD_SECONDS * 1000
    const ticker = setInterval(() => {
      const el = (performance.now() - start) / 1000
      progress.value = Math.min(el / LOAD_SECONDS, 1)
      if (el > 0.5) liveMbps.value = round((stats.bytes * 8) / 1e6 / el)
    }, 250)
    try {
      const [, ping] = await Promise.all([
        Promise.all(Array.from({ length: PARALLEL }, () => worker(signal, stats, deadline))),
        pingLoop(signal, () => performance.now() >= deadline),
      ])
      const elapsed = (performance.now() - start) / 1000
      return { mbps: stats.bytes ? round((stats.bytes * 8) / 1e6 / elapsed) : null, jitter: ping.jitter }
    } finally {
      clearInterval(ticker)
    }
  }

  /** @param pings jumlah ping pada fase idle (stabilitas), mis. 30–60 */
  async function run(pings = 40) {
    if (running.value) return
    running.value = true
    error.value = null
    result.value = null
    liveMbps.value = null
    abortCtl = new AbortController()
    const { signal } = abortCtl
    const startedAt = performance.now()
    try {
      // 1. Idle: latency, jitter, packet loss
      phase.value = 'latency'
      progress.value = 0
      let count = 0
      const idle = await pingLoop(signal, () => count >= pings, (n) => { count = n; progress.value = Math.min(n / pings, 1) })
      if (idle.latency === null) throw new Error('Server tidak merespons ping')

      // 2. Download (+ jitter saat download)
      phase.value = 'download'
      progress.value = 0
      liveMbps.value = null
      const down = await loadPhase(signal, downloadWorker)

      // 3. Upload (+ jitter saat upload)
      phase.value = 'upload'
      progress.value = 0
      liveMbps.value = null
      const up = await loadPhase(signal, uploadWorker)

      result.value = {
        download_mbps: down.mbps,
        upload_mbps: up.mbps,
        latency_ms: idle.latency,
        jitter_ms: idle.jitter,
        download_jitter_ms: down.jitter,
        upload_jitter_ms: up.jitter,
        packet_loss_pct: idle.loss,
        duration_sec: Math.round((performance.now() - startedAt) / 1000),
      }
      phase.value = 'done'
    } catch (e: any) {
      if (!signal.aborted) error.value = e?.message || 'Tes gagal'
      phase.value = 'idle'
    } finally {
      liveMbps.value = null
      running.value = false
    }
  }

  return { running, phase, progress, liveMbps, result, error, run, stop: () => abortCtl?.abort() }
}

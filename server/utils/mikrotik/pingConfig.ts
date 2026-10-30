import { DEFAULT_THRESHOLDS } from './analytics'

// Tidak ada konfigurasi env: setting per WAN (IP sumber, routing table) dibaca dari router (lihat resolveWanPing),
// target ping dan ambang kualitas memakai nilai tetap berikut.
const PING_TARGETS = ['1.1.1.1', '8.8.8.8']
const PING_INTERVAL_SEC = 30
const PING_COUNT = 5

export function pingConfig() {
  return { targets: PING_TARGETS, intervalSec: PING_INTERVAL_SEC, count: PING_COUNT, thresholds: DEFAULT_THRESHOLDS }
}

import type mysql from 'mysql2/promise'
import { getDb } from '../database/index'
import { buildDailyReport } from './dailyReport'
import { formatDailyReportText } from './dailyReportText'

const API = 'https://api.dingtalk.com/v1.0'
const MAX_MESSAGE_CHARS = 4500

export interface DingtalkSettings {
  app_key: string
  app_secret: string
  robot_code: string
  open_conversation_id: string
  enabled: number
  send_time: string
  staff_user_ids: string | null
  last_sent_date: string | null
}

export async function loadDingtalkSettings(db: mysql.Pool): Promise<DingtalkSettings | null> {
  const [rows] = await db.execute('SELECT * FROM dingtalk_settings WHERE id = 1') as any[]
  return (rows as any[])[0] || null
}

export function isConfigured(s: DingtalkSettings | null): s is DingtalkSettings {
  return !!(s && s.app_key && s.app_secret && s.robot_code && s.open_conversation_id)
}

export function parseStaffIds(s: DingtalkSettings): number[] {
  try {
    const arr = JSON.parse(s.staff_user_ids || '[]')
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : []
  } catch { return [] }
}

// ── access token (cache in-memory sampai mendekati kedaluwarsa) ──
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getAccessToken(s: DingtalkSettings, force = false): Promise<string> {
  const cacheKey = `${s.app_key}:${s.app_secret}`
  const cached = tokenCache.get(cacheKey)
  if (!force && cached && cached.expiresAt > Date.now()) return cached.token

  const res = await fetch(`${API}/oauth2/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appKey: s.app_key, appSecret: s.app_secret }),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json.accessToken) {
    throw new Error(`DingTalk accessToken gagal (${res.status}): ${json.message || json.errmsg || JSON.stringify(json)}`)
  }
  const ttl = Number(json.expireIn || 7200)
  tokenCache.set(cacheKey, { token: json.accessToken, expiresAt: Date.now() + Math.max(ttl - 300, 60) * 1000 })
  return json.accessToken
}

async function postGroupMessage(s: DingtalkSettings, token: string, text: string) {
  return fetch(`${API}/robot/groupMessages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-acs-dingtalk-access-token': token },
    body: JSON.stringify({
      robotCode: s.robot_code,
      openConversationId: s.open_conversation_id,
      msgKey: 'sampleText',
      msgParam: JSON.stringify({ content: text }),
    }),
  })
}

export async function sendGroupText(s: DingtalkSettings, text: string) {
  let res = await postGroupMessage(s, await getAccessToken(s), text)
  if (res.status === 401) res = await postGroupMessage(s, await getAccessToken(s, true), text)
  if (!res.ok) {
    const json: any = await res.json().catch(() => ({}))
    throw new Error(`DingTalk kirim pesan gagal (${res.status}): ${json.message || json.errmsg || JSON.stringify(json)}`)
  }
}

/** Satu pesan per staff; potong bila melebihi batas panjang. */
function limitMessage(text: string): string {
  return text.length > MAX_MESSAGE_CHARS ? text.slice(0, MAX_MESSAGE_CHARS - 20) + '\n…(dipotong)' : text
}

async function writeLog(db: mysql.Pool, type: 'auto' | 'manual' | 'test', date: string | null, status: 'success' | 'failed', detail: string, sentBy: number | null) {
  await db.execute(
    'INSERT INTO dingtalk_send_logs (trigger_type, report_date, status, detail, sent_by) VALUES (?, ?, ?, ?, ?)',
    [type, date, status, detail.slice(0, 2000), sentBy]
  ).catch(() => {})
}

/**
 * Bangun & kirim Daily Report ke grup DingTalk.
 * userIds kosong/null => semua staff yang dipilih di setting.
 * Melempar error bila gagal (sudah dicatat di dingtalk_send_logs).
 */
export async function sendDailyReport(opts: { date: string; userIds?: number[] | null; trigger: 'auto' | 'manual'; sentBy?: number | null }) {
  const db = getDb()
  const settings = await loadDingtalkSettings(db)
  try {
    if (!isConfigured(settings)) throw new Error('Pengaturan DingTalk belum lengkap')
    const ids = opts.userIds?.length ? opts.userIds : parseStaffIds(settings)
    if (!ids.length) throw new Error('Tidak ada staff yang dipilih')

    const [users] = await db.query('SELECT id, name FROM users WHERE id IN (?)', [ids]) as any[]
    const names = new Map<number, string>((users as any[]).map(u => [u.id, u.name]))

    const blocks: string[] = []
    for (const id of ids) {
      const report = await buildDailyReport(db, opts.date, { userId: id })
      blocks.push(formatDailyReportText(report, opts.date, names.get(id) || `User #${id}`))
    }

    for (const b of blocks) await sendGroupText(settings, limitMessage(b))

    await writeLog(db, opts.trigger, opts.date, 'success', `${ids.length} staff, ${blocks.length} pesan`, opts.sentBy ?? null)
    return { sent: blocks.length, staff: ids.length }
  } catch (e: any) {
    await writeLog(db, opts.trigger, opts.date, 'failed', String(e?.message || e), opts.sentBy ?? null)
    throw e
  }
}

export async function sendTestMessage(sentBy: number | null) {
  const db = getDb()
  const settings = await loadDingtalkSettings(db)
  try {
    if (!isConfigured(settings)) throw new Error('Pengaturan DingTalk belum lengkap')
    await sendGroupText(settings, 'Tes koneksi Daily Report dari Shadow Care ✅')
    await writeLog(db, 'test', null, 'success', 'OK', sentBy)
  } catch (e: any) {
    await writeLog(db, 'test', null, 'failed', String(e?.message || e), sentBy)
    throw e
  }
}

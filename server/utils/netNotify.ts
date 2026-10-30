import { getDb } from '../database/index'
import { broadcastToUsers } from './sse'
import { sendGroupAlert } from './dingtalk'

/** Notifikasi jaringan: in-app ke semua admin & staff aktif + SSE + pesan grup DingTalk. */
export async function notifyNetwork(title: string, message: string) {
  const db = getDb()
  const [recipients] = await db.execute("SELECT id FROM users WHERE role IN ('admin', 'staff') AND is_active = 1") as any[]
  const ids = (recipients as any[]).map(a => a.id)
  for (const id of ids) {
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'network')`,
      [id, title, message]
    )
  }
  broadcastToUsers(ids, 'notification', { title, message, type: 'network' })
  // tidak di-await: panggilan jaringan DingTalk tidak boleh menunda siklus polling (sendGroupAlert tidak pernah melempar)
  void sendGroupAlert(`${title}\n${message}`)
}

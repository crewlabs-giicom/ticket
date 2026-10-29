import { unlink } from 'fs/promises'
import { join, normalize } from 'path'
import { getDb } from '../../../database/index'
import { requireInfraAdmin } from '../../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  // CASCADE hanya menghapus baris DB; file foto di disk dihapus manual
  const [photos] = await db.execute('SELECT filename FROM cleaning_log_photos WHERE log_id = ?', [id]) as any[]
  const root = join(process.cwd(), 'storage', 'uploads')
  for (const p of photos as any[]) {
    const full = normalize(join(root, p.filename))
    if (full.startsWith(root)) await unlink(full).catch(() => {})
  }

  await db.execute('DELETE FROM cleaning_logs WHERE id = ?', [id])
  return { success: true }
})

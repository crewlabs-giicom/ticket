import { getDb } from '../database/index'

export default defineNitroPlugin(async () => {
  async function archiveDoneTasks() {
    try {
      const db = getDb()
      await db.execute(`
        UPDATE tasks SET is_archived = 1
        WHERE status = 'done'
          AND is_archived = 0
          AND completed_at IS NOT NULL
          AND completed_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
      `)
    } catch {}
  }

  await archiveDoneTasks()
  setInterval(archiveDoneTasks, 60 * 60 * 1000)
})

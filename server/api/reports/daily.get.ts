import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'
import { buildDailyReport } from '../../utils/dailyReport'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()

  if (user.role === 'customer') throw createError({ statusCode: 403 })

  const q = getQuery(event)
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' })
  const date = String(q.date || today)
  const userId = q.user_id ? Number(q.user_id) : null

  // Staff can only see their own data regardless of user_id param
  const effectiveUserId = user.role === 'staff' ? user.id : userId

  const report = await buildDailyReport(db, date, {
    userId: effectiveUserId,
    projectScopeUserId: user.role === 'staff' ? user.id : null,
  })

  let selectedUser: any = null
  if (userId) {
    const [uRows] = await db.execute('SELECT id, name FROM users WHERE id = ?', [userId]) as any[]
    selectedUser = (uRows as any[])[0] || null
  }

  return { date, user: selectedUser, ...report }
})

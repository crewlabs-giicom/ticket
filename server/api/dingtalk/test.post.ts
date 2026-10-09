import { requireRole } from '../../utils/rbac'
import { sendTestMessage } from '../../utils/dingtalk'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin'])
  try {
    await sendTestMessage(user.id)
  } catch (e: any) {
    throw createError({ statusCode: 502, message: String(e?.message || e) })
  }
  return { success: true }
})

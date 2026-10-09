import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'
import { loadDingtalkSettings, isConfigured } from '../../utils/dingtalk'

// Dipakai halaman Daily Report untuk menentukan apakah tombol kirim ditampilkan.
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  if (user.role === 'customer') throw createError({ statusCode: 403 })
  const s = await loadDingtalkSettings(getDb()).catch(() => null)
  return { success: true, configured: isConfigured(s) }
})

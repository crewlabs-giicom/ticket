import { getDb } from '../../../database/index'
import { requireInfraAdmin } from '../../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  await getDb().execute('DELETE FROM cleaning_logs WHERE id = ?', [Number(getRouterParam(event, 'id'))])
  return { success: true }
})

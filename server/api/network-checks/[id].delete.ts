import { getDb } from '../../database/index'
import { requireInfraAdmin } from '../../utils/infra'

export default defineEventHandler(async (event) => {
  requireInfraAdmin(event)
  await getDb().execute('DELETE FROM network_checks WHERE id = ?', [Number(getRouterParam(event, 'id'))])
  return { success: true }
})

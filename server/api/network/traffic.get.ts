import { requireRole } from '../../utils/rbac'
import { getTraffic } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  return await getTraffic()
})

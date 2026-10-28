import { requireRole } from '../../utils/rbac'
import { getInterfaces } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  return await getInterfaces()
})

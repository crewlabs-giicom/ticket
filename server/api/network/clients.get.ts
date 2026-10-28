import { requireRole } from '../../utils/rbac'
import { getClients } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  return await getClients()
})

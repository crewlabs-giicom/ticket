import { requireInfraUser } from '../../utils/infra'
import { getInterfaces } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  return await getInterfaces()
})

import { requireInfraUser } from '../../utils/infra'
import { getClients } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  return await getClients()
})

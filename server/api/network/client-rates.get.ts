import { requireInfraUser } from '../../utils/infra'
import { getClientRates } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  return await getClientRates()
})

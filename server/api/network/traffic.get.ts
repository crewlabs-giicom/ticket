import { requireInfraUser } from '../../utils/infra'
import { getTraffic } from '../../utils/mikrotik/service'

export default defineEventHandler(async (event) => {
  requireInfraUser(event)
  return await getTraffic()
})

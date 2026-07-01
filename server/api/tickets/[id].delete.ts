import { getDb } from '../../database/index'
import { requireRole } from '../../utils/rbac'
import { deletePolymorphicHistory } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = getDb()
  const id = Number(getRouterParam(event, 'id'))

  const [[ticket]] = await db.execute('SELECT id, ticket_number FROM tickets WHERE id = ?', [id]) as any[]
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket not found' })

  // Child rows (attachments, responses, messages, participants, notifications,
  // qc_checklist_item_tickets links) all cascade via real FKs. Only the polymorphic
  // history tables need manual cleanup since they aren't real FKs.
  await deletePolymorphicHistory(db, 'ticket', [id])
  await db.execute('DELETE FROM tickets WHERE id = ?', [id])

  return { success: true }
})

import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const userId = user.id

  const [[ticketsCreated], [ticketsAssigned], [tasksAssigned], [projectsInvolved]] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [userId]),
    db.execute('SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?', [userId]),
    db.execute('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?', [userId]),
    db.execute(`
      SELECT COUNT(DISTINCT project_id) as count FROM (
        SELECT project_id FROM tickets WHERE created_by = ? OR assigned_to = ?
        UNION
        SELECT project_id FROM tasks WHERE assigned_to = ? AND project_id IS NOT NULL
      ) t
    `, [userId, userId, userId]),
  ])

  return {
    success: true,
    data: {
      tickets_created: (ticketsCreated as any[])[0]?.count ?? 0,
      tickets_assigned: (ticketsAssigned as any[])[0]?.count ?? 0,
      tasks_assigned: (tasksAssigned as any[])[0]?.count ?? 0,
      projects_involved: (projectsInvolved as any[])[0]?.count ?? 0,
    }
  }
})

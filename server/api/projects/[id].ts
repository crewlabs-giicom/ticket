import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.project_id = p.id) AS ticket_count,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'done') AS task_done,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status IN ('todo','in_progress','review')) AS task_waiting,
        (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.due_date < NOW() AND tk.status != 'done') AS task_overdue,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT GROUP_CONCAT(CONCAT(u.id,'|',u.name,'|',u.role,'|',IFNULL(u.avatar,'')) ORDER BY u.id SEPARATOR ';;')
         FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = p.id) AS members_raw
      FROM projects p
      WHERE p.id = ?
    `, [id])
    const project = (rows as any[])[0]
    if (!project) throw createError({ statusCode: 404 })

    // Parse members_raw into array
    const members = project.members_raw
      ? project.members_raw.split(';;').map((s: string) => {
          const [mid, name, role, avatar] = s.split('|')
          return { id: Number(mid), name, role, avatar: avatar || null }
        })
      : []
    delete project.members_raw

    return { data: { ...project, members } }
  }

  if (event.method === 'PUT') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const body = await readBody(event)
    await db.execute(
      'UPDATE projects SET name=?, description=?, status=?, is_active=?, updated_at=NOW() WHERE id=?',
      [body.name, body.description ?? '', body.status ?? 'active', body.is_active ?? 1, id]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    await db.execute('UPDATE projects SET is_active=0 WHERE id=?', [id])
    return { success: true }
  }
})

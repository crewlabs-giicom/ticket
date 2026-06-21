import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user
  const id = getRouterParam(event, 'id')

  if (event.method === 'GET') {
    const [rows] = await db.execute(`
      SELECT p.*,
        COUNT(DISTINCT t.id) AS ticket_count,
        COUNT(DISTINCT tk.id) AS task_count,
        SUM(CASE WHEN tk.status = 'done' THEN 1 ELSE 0 END) AS task_done,
        SUM(CASE WHEN tk.status IN ('todo','in_progress','review') THEN 1 ELSE 0 END) AS task_waiting,
        SUM(CASE WHEN tk.due_date < NOW() AND tk.status != 'done' THEN 1 ELSE 0 END) AS task_overdue,
        COUNT(DISTINCT pm.user_id) AS member_count,
        GROUP_CONCAT(DISTINCT CONCAT(u.id,'|',u.name,'|',u.role,'|',IFNULL(u.avatar,'')) ORDER BY u.id SEPARATOR ';;') AS members_raw
      FROM projects p
      LEFT JOIN tickets t ON t.project_id = p.id
      LEFT JOIN tasks tk ON tk.project_id = p.id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = pm.user_id
      WHERE p.id = ?
      GROUP BY p.id
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

import { getDb } from '../../database/index'
import { requireAuth, isProjectAdmin } from '../../utils/rbac'
import { logActivity } from '../../utils/activity'
import { broadcastToUser } from '../../utils/sse'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const body = await readBody(event)

  const { project_id, title, description, assigned_to, status = 'backlog', system_menu_id } = body
  const due_date = body.due_date ? String(body.due_date).slice(0, 10) : null
  if (!project_id || !title) throw createError({ statusCode: 400, message: 'project_id and title required' })

  if (user.role === 'customer') {
    const isPA = await isProjectAdmin(db, user.id, Number(project_id))
    if (!isPA) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Get max position in this column
  const [posRows] = await db.execute(
    'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE project_id = ? AND status = ?',
    [project_id, status]
  ) as any[]
  const position = posRows[0]?.next_pos ?? 0

  const [result] = await db.execute(
    `INSERT INTO tasks (project_id, title, description, status, position, assigned_to, created_by, due_date, system_menu_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [project_id, title, description || null, status, position, assigned_to || null, user.id, due_date || null, system_menu_id || null]
  ) as any[]

  const attachments = body.attachments as Array<{ filename: string; original_name: string; mime_type?: string; size?: number }> | undefined
  if (attachments?.length) {
    for (const a of attachments) {
      await db.execute(
        'INSERT INTO task_attachments (task_id, filename, original_name, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, a.filename, a.original_name, a.mime_type || null, a.size || null, user.id]
      )
    }
  }

  await logActivity(db, {
    entity_type: 'task',
    entity_id: result.insertId,
    action: 'created',
    label: `Task dibuat oleh ${user.name}`,
    user_id: user.id,
  })

  // Notifikasi ke assignee jika bukan diri sendiri
  if (assigned_to && Number(assigned_to) !== user.id) {
    const notifTitle = 'Task di-assign ke kamu'
    const notifMsg = `${user.name} menugaskan task "${title}" ke kamu`
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)',
      [assigned_to, notifTitle, notifMsg, 'task_assigned', result.insertId]
    )
    broadcastToUser(Number(assigned_to), 'notification', {
      title: notifTitle, message: notifMsg, type: 'task_assigned', task_id: result.insertId
    })
  }

  // Notifikasi task_created ke semua staff/admin project member (kecuali creator)
  const [members] = await db.execute(
    `SELECT u.id FROM users u
     JOIN project_members pm ON pm.user_id = u.id
     WHERE pm.project_id = ? AND u.role IN ('staff','admin') AND u.is_active = 1 AND u.id != ?`,
    [project_id, user.id]
  )
  for (const m of members as any[]) {
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)',
      [m.id, 'Task baru dibuat', `${user.name} membuat task: ${title}`, 'task_created', result.insertId]
    )
    broadcastToUser(m.id, 'notification', {
      title: 'Task baru dibuat',
      message: `${user.name}: ${title}`,
      type: 'task_created',
      task_id: result.insertId,
    })
  }

  const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId])
  return (rows as any[])[0]
})

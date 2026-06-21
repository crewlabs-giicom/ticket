import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'
import { logActivity } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const [oldRows] = await db.execute('SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?', [id]) as any[]
  const old = (oldRows as any[])[0]
  if (!old) throw createError({ statusCode: 404, message: 'Task not found' })

  if (user.role === 'staff') {
    const [mem] = await db.execute('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', [old.project_id, user.id])
    if (!(mem as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const allowed = ['title', 'description', 'status', 'position', 'assigned_to', 'due_date', 'system_menu_id']
  const sets: string[] = []
  const params: any[] = []

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`)
      let val = body[key] ?? null
      if (key === 'due_date' && val) val = String(val).slice(0, 10)
      params.push(val)
    }
  }

  if (!sets.length) throw createError({ statusCode: 400, message: 'Nothing to update' })

  // Set completed_at when status changes to 'done'
  if ('status' in body && body.status === 'done' && old.status !== 'done') {
    sets.push('completed_at = NOW()')
  } else if ('status' in body && body.status !== 'done' && old.status === 'done') {
    sets.push('completed_at = NULL')
  }

  params.push(id)
  await db.execute(`UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params)

  if ('status' in body && body.status !== old.status) {
    const LABELS: Record<string, string> = { backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done' }
    await logActivity(db, {
      entity_type: 'task', entity_id: Number(id), action: 'status_changed',
      from_value: old.status, to_value: body.status,
      label: `${user.name} mengubah status dari "${LABELS[old.status] ?? old.status}" ke "${LABELS[body.status] ?? body.status}"`,
      user_id: user.id,
    })
  }

  if ('assigned_to' in body && body.assigned_to !== old.assigned_to) {
    if (body.assigned_to) {
      const [uRows] = await db.execute('SELECT name FROM users WHERE id = ?', [body.assigned_to]) as any[]
      const toName = (uRows as any[])[0]?.name ?? 'seseorang'
      await logActivity(db, {
        entity_type: 'task', entity_id: Number(id), action: 'assigned',
        to_value: String(body.assigned_to),
        label: `${user.name} menugaskan task ke ${toName}`,
        user_id: user.id,
      })
    } else {
      await logActivity(db, {
        entity_type: 'task', entity_id: Number(id), action: 'unassigned',
        from_value: old.assigned_to_name,
        label: `${user.name} menghapus penugasan`,
        user_id: user.id,
      })
    }
  }

  const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id])
  return (rows as any[])[0]
})

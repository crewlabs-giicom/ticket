import { getDb } from '../../database/index'
import { requireAuth } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = getDb()
  const id = getRouterParam(event, 'id')

  if (user.role === 'customer') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const [rows] = await db.execute(
    `SELECT t.*, p.name as project_name, u.name as assigned_to_name,
            cb.name as created_by_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN users cb ON cb.id = t.created_by
     WHERE t.id = ?`,
    [id]
  )
  const task = (rows as any[])[0]
  if (!task) throw createError({ statusCode: 404, message: 'Task not found' })

  if (user.role === 'staff') {
    const [mem] = await db.execute('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', [task.project_id, user.id])
    if (!(mem as any[]).length) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const [tickets] = await db.execute(
    `SELECT tk.id, tk.ticket_number, tk.title, tk.status_id, ts.name as status_name, ts.color as status_color
     FROM tickets tk
     LEFT JOIN ticket_statuses ts ON ts.id = tk.status_id
     WHERE tk.task_id = ?`,
    [id]
  )

  const [checklist] = await db.execute(
    'SELECT * FROM task_checklist_items WHERE task_id = ? ORDER BY order_index, id',
    [id]
  )

  const [comments] = await db.execute(
    `SELECT tc.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar
     FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = ? ORDER BY tc.created_at ASC`,
    [id]
  )

  const commentList = comments as any[]

  // Fetch attachments per comment
  if (commentList.length) {
    const ids = commentList.map(c => c.id)
    const placeholders = ids.map(() => '?').join(',')
    const [commentAttachments] = await db.execute(
      `SELECT * FROM task_attachments WHERE task_comment_id IN (${placeholders}) ORDER BY created_at ASC`,
      ids
    )
    for (const c of commentList) {
      c.attachments = (commentAttachments as any[]).filter(a => a.task_comment_id === c.id)
    }
  }

  // Task-level attachments (not linked to a comment)
  const [attachments] = await db.execute(
    `SELECT ta.*, u.name as uploaded_by_name
     FROM task_attachments ta LEFT JOIN users u ON u.id = ta.uploaded_by
     WHERE ta.task_id = ? AND ta.task_comment_id IS NULL
     ORDER BY ta.created_at ASC`,
    [id]
  )

  const [history] = await db.execute(
    `SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.entity_type = 'task' AND al.entity_id = ? ORDER BY al.created_at ASC`,
    [id]
  )

  return { ...task, tickets, checklist, comments: commentList, attachments, history }
})

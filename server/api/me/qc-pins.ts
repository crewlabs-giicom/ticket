import { getDb } from '../../database/index'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const user = event.context.user

  if (event.method === 'GET') {
    const [rows] = await db.execute(
      'SELECT qc_form_id, task_title, sequence FROM user_pinned_qc_tabs WHERE user_id = ? ORDER BY created_at ASC',
      [user.id]
    )
    return { success: true, data: rows }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { qc_form_id, task_title, sequence } = body
    if (!qc_form_id) throw createError({ statusCode: 400, statusMessage: 'qc_form_id required' })
    await db.execute(
      'INSERT INTO user_pinned_qc_tabs (user_id, qc_form_id, task_title, sequence) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE task_title=VALUES(task_title), sequence=VALUES(sequence)',
      [user.id, qc_form_id, task_title || '', sequence || 1]
    )
    return { success: true }
  }

  if (event.method === 'DELETE') {
    const body = await readBody(event)
    const { qc_form_id } = body
    if (!qc_form_id) throw createError({ statusCode: 400, statusMessage: 'qc_form_id required' })
    await db.execute(
      'DELETE FROM user_pinned_qc_tabs WHERE user_id = ? AND qc_form_id = ?',
      [user.id, qc_form_id]
    )
    return { success: true }
  }
})

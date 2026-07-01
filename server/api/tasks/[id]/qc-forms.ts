import { getDb } from '../../../database/index'
import { requireRole, requireAuth } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'
import { broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const taskId = Number(getRouterParam(event, 'id'))

  if (event.method === 'GET') {
    requireAuth(event)
    const [forms] = await db.execute(
      `SELECT qf.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id) as checker_count,
        (SELECT COUNT(*) FROM qc_form_checkers WHERE qc_form_id = qf.id AND is_done = 1) as done_count,
        (SELECT COUNT(*)
         FROM tickets tk
         JOIN qc_checklist_item_tickets qcit ON qcit.ticket_id = tk.id
         JOIN qc_checklist_items qci ON qci.id = qcit.qc_checklist_item_id
         JOIN ticket_statuses ts ON ts.id = tk.status_id
         WHERE qci.qc_form_id = qf.id AND ts.is_resolved = 0) as open_ticket_count
       FROM qc_forms qf
       JOIN users u ON u.id = qf.created_by
       WHERE qf.task_id = ?
       ORDER BY qf.sequence ASC`,
      [taskId]
    )
    return forms
  }

  if (event.method === 'POST') {
    // Only staff/admin can push to QC
    const user = requireRole(event, ['admin', 'staff'])
    const body = await readBody(event)
    const { qc_template_id, checker_ids, manual_items, estimated_duration } = body

    if (!Array.isArray(checker_ids) || checker_ids.length === 0) {
      throw createError({ statusCode: 400, message: 'Minimal 1 checker diperlukan' })
    }

    // Validate task exists and is in review status
    const [[task]] = await db.execute(
      `SELECT id, title, status, project_id, assigned_to, prd_id FROM tasks WHERE id = ? AND is_archived = 0`,
      [taskId]
    ) as any[]
    if (!task) throw createError({ statusCode: 404, message: 'Task tidak ditemukan' })
    if (task.status !== 'review') throw createError({ statusCode: 400, message: 'Task harus berstatus Review untuk Push to QC' })

    // Fetch PRD's original_due_date if task is linked to a PRD
    let prdOriginalDueDate: string | null = null
    if (task.prd_id) {
      const [[prd]] = await db.execute(`SELECT original_due_date FROM prds WHERE id = ?`, [task.prd_id]) as any[]
      prdOriginalDueDate = prd?.original_due_date || null
    }

    // Determine next sequence
    const [[seqRow]] = await db.execute(
      `SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq FROM qc_forms WHERE task_id = ?`,
      [taskId]
    ) as any[]
    const sequence = seqRow.next_seq

    const conn = await db.getConnection()
    let qcFormId: number
    try {
      await conn.beginTransaction()

      // Create qc_forms row
      const [formResult] = await conn.execute(
        `INSERT INTO qc_forms (task_id, sequence, qc_template_id, status, created_by, original_due_date, actual_start_date, estimated_duration)
         VALUES (?, ?, ?, 'active', ?, ?, NOW(), ?)`,
        [taskId, sequence, qc_template_id || null, user.id, prdOriginalDueDate, estimated_duration ? Number(estimated_duration) : null]
      ) as any[]
      qcFormId = formResult.insertId

      // Collect template items
      let templateItems: string[] = []
      if (qc_template_id) {
        const [items] = await conn.execute(
          `SELECT item_name FROM qc_template_items WHERE qc_template_id = ? ORDER BY order_index ASC`,
          [qc_template_id]
        ) as any[]
        templateItems = (items as any[]).map((i: any) => i.item_name)
      }

      // Collect manual items
      const manualItems: string[] = Array.isArray(manual_items)
        ? manual_items.map((s: string) => String(s).trim()).filter(Boolean)
        : []

      const allItems = [
        ...templateItems.map(n => ({ name: n, source: 'template' })),
        ...manualItems.map(n => ({ name: n, source: 'manual' })),
      ]

      // For each checker × each item, insert a qc_checklist_items row
      const checkerIdNums = checker_ids.map(Number).filter(Boolean)
      for (const checkerId of checkerIdNums) {
        // Insert checker record
        await conn.execute(
          `INSERT INTO qc_form_checkers (qc_form_id, user_id) VALUES (?, ?)`,
          [qcFormId, checkerId]
        )
        // Insert items for this checker
        for (const item of allItems) {
          await conn.execute(
            `INSERT INTO qc_checklist_items (qc_form_id, checker_id, item_name, source) VALUES (?, ?, ?, ?)`,
            [qcFormId, checkerId, item.name, item.source]
          )
        }
      }

      // Update task status to in_qc
      await conn.execute(`UPDATE tasks SET status = 'in_qc' WHERE id = ?`, [taskId])

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      conn.release()
      throw e
    }
    conn.release()

    await logActivity(db, {
      entity_type: 'task',
      entity_id: taskId,
      action: 'status_changed',
      from_value: 'review',
      to_value: 'in_qc',
      label: `${user.name} mem-Push task ke QC (Form #${sequence})`,
      user_id: user.id,
    })

    // Notify each checker
    const checkerIdNums2 = checker_ids.map(Number).filter(Boolean)
    for (const checkerId of checkerIdNums2) {
      if (checkerId === user.id) continue
      const notifTitle = `Ditambahkan ke QC Form #${sequence}`
      const notifMsg = `${user.name} menambahkan kamu sebagai checker di QC Form #${sequence} untuk task "${task.title}"`
      await db.execute(
        `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
        [checkerId, notifTitle, notifMsg, 'qc_assigned', taskId]
      )
      broadcastToUser(checkerId, 'notification', { title: notifTitle, message: notifMsg, type: 'qc_assigned', task_id: taskId })
    }

    const [[createdForm]] = await db.execute(`SELECT * FROM qc_forms WHERE id = ?`, [qcFormId]) as any[]
    return createdForm
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

import { getDb } from '../../../database/index'
import { requireRole } from '../../../utils/rbac'
import { logActivity } from '../../../utils/activity'
import { broadcastToUser } from '../../../utils/sse'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin', 'staff'])
  const db = getDb()
  const prevFormId = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { checker_ids, manual_items } = body

  if (!Array.isArray(checker_ids) || checker_ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Minimal 1 checker diperlukan' })
  }

  // Load previous form
  const [[prevForm]] = await db.execute(
    `SELECT qf.*, t.title as task_title, t.status as task_status
     FROM qc_forms qf JOIN tasks t ON t.id = qf.task_id
     WHERE qf.id = ?`,
    [prevFormId]
  ) as any[]
  if (!prevForm) throw createError({ statusCode: 404, message: 'QC Form tidak ditemukan' })

  if (prevForm.status !== 'waiting_resubmit') {
    throw createError({ statusCode: 400, message: 'QC Form ini belum siap untuk diajukan ulang' })
  }

  // Block re-submitting an already-superseded form (a newer loop already exists for this task)
  const [[newerForm]] = await db.execute(
    `SELECT COUNT(*) as c FROM qc_forms WHERE task_id = ? AND sequence > ?`,
    [prevForm.task_id, prevForm.sequence]
  ) as any[]
  if (Number(newerForm.c) > 0) {
    throw createError({ statusCode: 400, message: 'QC Form ini sudah digantikan oleh pengajuan ulang berikutnya' })
  }

  // Precondition: all QC tickets from this form must be resolved/closed
  const [[openTickets]] = await db.execute(
    `SELECT COUNT(*) as c
     FROM tickets tk
     JOIN qc_checklist_item_tickets qcit ON qcit.ticket_id = tk.id
     JOIN qc_checklist_items qci ON qci.id = qcit.qc_checklist_item_id
     JOIN ticket_statuses ts ON ts.id = tk.status_id
     WHERE qci.qc_form_id = ? AND ts.is_resolved = 0`,
    [prevFormId]
  ) as any[]
  if (Number(openTickets.c) > 0) {
    throw createError({ statusCode: 400, message: `Masih ada ${openTickets.c} ticket QC yang belum resolved/closed` })
  }

  // Get item names from previous form (unique, first checker's set)
  const [[firstChecker]] = await db.execute(
    `SELECT user_id FROM qc_form_checkers WHERE qc_form_id = ? LIMIT 1`, [prevFormId]
  ) as any[]
  const [prevItems] = await db.execute(
    `SELECT item_name, source FROM qc_checklist_items WHERE qc_form_id = ? AND checker_id = ? ORDER BY id ASC`,
    [prevFormId, firstChecker?.user_id]
  ) as any[]

  const baseItems: { name: string; source: string }[] = (prevItems as any[]).map((i: any) => ({ name: i.item_name, source: i.source }))
  const extraItems: { name: string; source: string }[] = Array.isArray(manual_items)
    ? manual_items.map((s: string) => ({ name: String(s).trim(), source: 'manual' })).filter((i: any) => i.name)
    : []
  const allItems = [...baseItems, ...extraItems]

  const conn = await db.getConnection()
  let newFormId: number
  try {
    await conn.beginTransaction()

    const [formResult] = await conn.execute(
      `INSERT INTO qc_forms (task_id, sequence, qc_template_id, status, created_by) VALUES (?, ?, ?, 'active', ?)`,
      [prevForm.task_id, prevForm.sequence + 1, prevForm.qc_template_id || null, user.id]
    ) as any[]
    newFormId = (formResult as any).insertId

    // Old form's cycle is over now that it has been re-submitted into a new loop
    await conn.execute(
      `UPDATE qc_forms SET status = 'completed', actual_end_date = NOW() WHERE id = ?`,
      [prevFormId]
    )

    const checkerIdNums = checker_ids.map(Number).filter(Boolean)
    for (const checkerId of checkerIdNums) {
      await conn.execute(
        `INSERT INTO qc_form_checkers (qc_form_id, user_id) VALUES (?, ?)`,
        [newFormId, checkerId]
      )
      for (const item of allItems) {
        await conn.execute(
          `INSERT INTO qc_checklist_items (qc_form_id, checker_id, item_name, source) VALUES (?, ?, ?, ?)`,
          [newFormId, checkerId, item.name, item.source]
        )
      }
    }

    // Keep task status as in_qc
    await conn.execute(`UPDATE tasks SET status = 'in_qc' WHERE id = ?`, [prevForm.task_id])

    await conn.commit()
  } catch (e) {
    await conn.rollback()
    conn.release()
    throw e
  }
  conn.release()

  await logActivity(db, {
    entity_type: 'task',
    entity_id: prevForm.task_id,
    action: 'qc_loop',
    label: `${user.name} mengajukan QC ulang (Form #${prevForm.sequence + 1})`,
    user_id: user.id,
  })

  // Notify new checkers
  for (const checkerId of checker_ids.map(Number).filter(Boolean)) {
    if (checkerId === user.id) continue
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
      [checkerId, `QC Form #${prevForm.sequence + 1} dibuka`, `${user.name} mengajukan QC ulang untuk task "${prevForm.task_title}"`, 'qc_assigned', prevForm.task_id]
    )
    broadcastToUser(checkerId, 'notification', {
      title: `QC Form #${prevForm.sequence + 1}`,
      message: `${user.name}: QC ulang untuk "${prevForm.task_title}"`,
      type: 'qc_assigned',
      task_id: prevForm.task_id,
    })
  }

  const [[created]] = await db.execute(`SELECT * FROM qc_forms WHERE id = ?`, [newFormId]) as any[]
  return created
})

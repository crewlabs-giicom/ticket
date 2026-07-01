import type mysql from 'mysql2/promise'
import { broadcastToUser } from './sse'
import { logActivity } from './activity'

/**
 * Called whenever a checker marks Done or a QC ticket is resolved/closed.
 * Transitions task to 'done' and form to 'completed' when all conditions are met:
 * 1. All checkers have is_done = true
 * 2. No QC tickets linked to this form are still open (not resolved/closed)
 */
export async function checkQcFormCompletion(db: mysql.Pool, qcFormId: number) {
  // Load form + task
  const [[form]] = await db.execute(
    `SELECT qf.*, t.assigned_to as task_assignee, t.title as task_title
     FROM qc_forms qf
     JOIN tasks t ON t.id = qf.task_id
     WHERE qf.id = ? AND qf.status = 'active'`,
    [qcFormId]
  ) as any[]
  if (!form) return

  // Check all checkers done
  const [[checkerStatus]] = await db.execute(
    `SELECT COUNT(*) as total, SUM(is_done) as done_count FROM qc_form_checkers WHERE qc_form_id = ?`,
    [qcFormId]
  ) as any[]
  const allCheckersDone = Number(checkerStatus.total) > 0 && Number(checkerStatus.done_count) === Number(checkerStatus.total)
  if (!allCheckersDone) return

  // Check no open QC tickets linked to this form
  const [[openTickets]] = await db.execute(
    `SELECT COUNT(*) as c
     FROM tickets tk
     JOIN qc_checklist_item_tickets qcit ON qcit.ticket_id = tk.id
     JOIN qc_checklist_items qci ON qci.id = qcit.qc_checklist_item_id
     JOIN ticket_statuses ts ON ts.id = tk.status_id
     WHERE qci.qc_form_id = ? AND ts.is_resolved = 0`,
    [qcFormId]
  ) as any[]
  if (Number(openTickets.c) > 0) return

  // Check whether this form ever had any tickets linked (resolved or not)
  const [[everTickets]] = await db.execute(
    `SELECT COUNT(*) as c
     FROM tickets tk
     JOIN qc_checklist_item_tickets qcit ON qcit.ticket_id = tk.id
     JOIN qc_checklist_items qci ON qci.id = qcit.qc_checklist_item_id
     WHERE qci.qc_form_id = ?`,
    [qcFormId]
  ) as any[]
  if (Number(everTickets.c) > 0) {
    // Tickets were raised during this loop — even though resolved, require an explicit
    // re-submission (new loop) before the task can be considered Done.
    await db.execute(`UPDATE qc_forms SET status = 'waiting_resubmit' WHERE id = ?`, [qcFormId])

    await logActivity(db, {
      entity_type: 'qc_form', entity_id: qcFormId,
      action: 'status_changed',
      from_value: 'active', to_value: 'waiting_resubmit',
      label: `Semua checklist QC untuk task "${form.task_title}" selesai, namun pernah ada ticket — menunggu pengajuan ulang`,
    })

    if (form.task_assignee) {
      await db.execute(
        `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
        [form.task_assignee, 'QC Menunggu Pengajuan Ulang', `QC untuk task "${form.task_title}" perlu diajukan ulang untuk verifikasi karena sempat ada ticket.`, 'qc_waiting_resubmit', form.task_id]
      )
      broadcastToUser(Number(form.task_assignee), 'notification', {
        title: 'QC Menunggu Pengajuan Ulang',
        message: `Task "${form.task_title}" perlu QC ulang untuk verifikasi.`,
        type: 'qc_waiting_resubmit',
        task_id: form.task_id,
      })
    }

    const [waitingCheckers] = await db.execute(
      `SELECT user_id FROM qc_form_checkers WHERE qc_form_id = ?`, [qcFormId]
    ) as any[]
    for (const c of waitingCheckers as any[]) {
      if (c.user_id === form.task_assignee) continue
      await db.execute(
        `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
        [c.user_id, 'QC Menunggu Pengajuan Ulang', `QC untuk task "${form.task_title}" perlu diajukan ulang untuk verifikasi.`, 'qc_waiting_resubmit', form.task_id]
      )
      broadcastToUser(Number(c.user_id), 'notification', {
        title: 'QC Menunggu Pengajuan Ulang', message: `Task "${form.task_title}" perlu QC ulang.`, type: 'qc_waiting_resubmit', task_id: form.task_id,
      })
    }
    return
  }

  // All clear — mark form completed (with actual_end_date) and task done
  await db.execute(`UPDATE qc_forms SET status = 'completed', actual_end_date = NOW() WHERE id = ?`, [qcFormId])
  await db.execute(
    `UPDATE tasks SET status = 'done', completed_at = NOW() WHERE id = ? AND status = 'in_qc'`,
    [form.task_id]
  )

  await logActivity(db, {
    entity_type: 'qc_form', entity_id: qcFormId,
    action: 'status_changed',
    from_value: 'active', to_value: 'completed',
    label: `QC untuk task "${form.task_title}" selesai, task otomatis menjadi Done`,
  })
  await logActivity(db, {
    entity_type: 'task', entity_id: form.task_id,
    action: 'status_changed',
    from_value: 'in_qc', to_value: 'done',
    label: `Task "${form.task_title}" otomatis menjadi Done setelah lulus QC`,
  })

  // Notify task assignee
  if (form.task_assignee) {
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
      [form.task_assignee, 'QC Selesai', `Semua QC untuk task "${form.task_title}" telah selesai. Task otomatis menjadi Done.`, 'qc_completed', form.task_id]
    )
    broadcastToUser(Number(form.task_assignee), 'notification', {
      title: 'QC Selesai',
      message: `Task "${form.task_title}" telah lulus QC dan menjadi Done.`,
      type: 'qc_completed',
      task_id: form.task_id,
    })
  }

  // Notify checkers
  const [checkers] = await db.execute(
    `SELECT user_id FROM qc_form_checkers WHERE qc_form_id = ?`, [qcFormId]
  ) as any[]
  for (const c of checkers as any[]) {
    if (c.user_id === form.task_assignee) continue
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, task_id) VALUES (?, ?, ?, ?, ?)`,
      [c.user_id, 'QC Selesai', `Semua checklist QC untuk task "${form.task_title}" telah selesai.`, 'qc_completed', form.task_id]
    )
    broadcastToUser(Number(c.user_id), 'notification', {
      title: 'QC Selesai', message: `Task "${form.task_title}" lulus QC.`, type: 'qc_completed', task_id: form.task_id,
    })
  }
}

type TicketLike = { created_by?: number | null; assigned_to?: number | null } | null | undefined

/**
 * Daftar user yang berkepentingan atas sebuah ticket:
 * creator + assignee + semua participant. Dipakai untuk menentukan penerima
 * notifikasi maupun target broadcast SSE, supaya event ticket tidak bocor ke
 * user yang tidak terlibat.
 */
export async function getTicketAudience(db: any, ticketId: number | string, ticket?: TicketLike): Promise<number[]> {
  const audience = new Set<number>()

  let base = ticket
  if (!base) {
    const [rows] = await db.execute('SELECT created_by, assigned_to FROM tickets WHERE id = ?', [ticketId])
    base = (rows as any[])[0]
  }

  if (base?.created_by) audience.add(Number(base.created_by))
  if (base?.assigned_to) audience.add(Number(base.assigned_to))

  const [partRows] = await db.execute('SELECT user_id FROM ticket_participants WHERE ticket_id = ?', [ticketId])
  for (const p of partRows as any[]) {
    if (p.user_id) audience.add(Number(p.user_id))
  }

  return [...audience]
}

/** Audiens ticket tanpa user tertentu (mis. pelaku aksi). */
export async function getTicketAudienceExcept(db: any, ticketId: number | string, exceptUserId?: number | null, ticket?: TicketLike): Promise<number[]> {
  const audience = await getTicketAudience(db, ticketId, ticket)
  return exceptUserId ? audience.filter(id => id !== Number(exceptUserId)) : audience
}

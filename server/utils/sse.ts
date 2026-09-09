type Client = { userId: number; send: (data: string) => void }
const clients: Client[] = []

export function addSSEClient(userId: number, send: (data: string) => void) {
  clients.push({ userId, send })
}

export function removeSSEClient(send: (data: string) => void) {
  const idx = clients.findIndex(c => c.send === send)
  if (idx !== -1) clients.splice(idx, 1)
}

export function broadcastToUser(userId: number, event: string, data: object) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.filter(c => c.userId === userId).forEach(c => {
    try { c.send(payload) } catch {}
  })
}

/**
 * Kirim event hanya ke user-user tertentu (creator/assignee/participant ticket).
 * Nilai kosong dan duplikat diabaikan.
 */
export function broadcastToUsers(userIds: Array<number | null | undefined>, event: string, data: object) {
  const targets = new Set<number>()
  for (const id of userIds) {
    const numeric = Number(id)
    if (numeric) targets.add(numeric)
  }
  if (!targets.size) return

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => {
    if (!targets.has(c.userId)) return
    try { c.send(payload) } catch {}
  })
}

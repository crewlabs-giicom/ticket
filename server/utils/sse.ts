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

export function broadcastToAll(event: string, data: object) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => {
    try { c.send(payload) } catch {}
  })
}

export function broadcastToRole(role: string, event: string, data: object, db: any) {
  const users = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').all(role) as any[]
  users.forEach(u => broadcastToUser(u.id, event, data))
}

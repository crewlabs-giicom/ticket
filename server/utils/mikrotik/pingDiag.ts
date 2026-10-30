// Diagnostik ping terakhir per WAN (di memori proses): apa yang dibalas router, atau kenapa gagal.
// Hanya untuk ditampilkan di kartu WAN agar penyebab "loss 100%" bisa dilihat tanpa membuka log server.
export interface PingDiagTarget { target: string; error: string | null; rows: number; raw: string }
export interface PingDiag { at: number; targets: PingDiagTarget[] }

const store = new Map<string, PingDiag>()

export const setPingDiag = (name: string, targets: PingDiagTarget[]) => { store.set(name, { at: Date.now(), targets }) }
export const getPingDiag = () => Object.fromEntries(store)

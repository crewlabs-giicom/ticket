import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: InstanceType<typeof DatabaseSync> | null = null

export function getDb(): InstanceType<typeof DatabaseSync> {
  if (db) return db
  const dir = resolve(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  db = new DatabaseSync(resolve(dir, 'ticketing.db'))
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  seed(db)
  return db
}

function migrate(db: InstanceType<typeof DatabaseSync>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      avatar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS priorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      order_index INTEGER NOT NULL DEFAULT 0,
      sla_hours INTEGER NOT NULL DEFAULT 24,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      order_index INTEGER NOT NULL DEFAULT 0,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      priority_id INTEGER NOT NULL REFERENCES priorities(id),
      status_id INTEGER NOT NULL REFERENCES ticket_statuses(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      assigned_to INTEGER REFERENCES users(id),
      due_date TEXT,
      sla_breached INTEGER NOT NULL DEFAULT 0,
      resolved_at TEXT,
      closed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      response_id INTEGER REFERENCES ticket_responses(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      ticket_id INTEGER REFERENCES tickets(id),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'i-heroicons-home',
      order_index INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'all',
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `)
}

function seed(db: InstanceType<typeof DatabaseSync>) {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c
  if (userCount > 0) return

  const demoPass = 'demo_password_hashed'

  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Admin Utama', 'admin@ticketing.com', demoPass, 'admin')
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Budi Santoso', 'budi@ticketing.com', demoPass, 'staff')
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Siti Rahayu', 'siti@ticketing.com', demoPass, 'staff')
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('Ahmad Fauzi', 'ahmad@ticketing.com', demoPass, 'staff')
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('PT Maju Jaya', 'customer1@example.com', demoPass, 'customer')
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`).run('CV Berkah', 'customer2@example.com', demoPass, 'customer')

  db.prepare(`INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)`).run('Critical', '#ef4444', 1, 4)
  db.prepare(`INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)`).run('High', '#f97316', 2, 24)
  db.prepare(`INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)`).run('Medium', '#f59e0b', 3, 72)
  db.prepare(`INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)`).run('Low', '#22c55e', 4, 168)

  db.prepare(`INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)`).run('Open', '#6366f1', 1, 0)
  db.prepare(`INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)`).run('In Progress', '#3b82f6', 2, 0)
  db.prepare(`INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)`).run('Waiting Customer', '#f59e0b', 3, 0)
  db.prepare(`INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)`).run('Resolved', '#22c55e', 4, 1)
  db.prepare(`INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)`).run('Closed', '#64748b', 5, 1)

  db.prepare(`INSERT INTO projects (name, description) VALUES (?, ?)`).run('Website Company Profile', 'Maintenance website utama perusahaan')
  db.prepare(`INSERT INTO projects (name, description) VALUES (?, ?)`).run('Aplikasi Mobile', 'Development aplikasi mobile iOS dan Android')
  db.prepare(`INSERT INTO projects (name, description) VALUES (?, ?)`).run('ERP System', 'Implementasi dan support ERP')
  db.prepare(`INSERT INTO projects (name, description) VALUES (?, ?)`).run('IT Infrastructure', 'Pengelolaan server dan jaringan')

  const menus = [
    { name: 'Dashboard', path: '/', icon: 'dashboard', order_index: 1, role: 'all' },
    { name: 'Tickets', path: '/tickets', icon: 'ticket', order_index: 2, role: 'all' },
    { name: 'Kalender', path: '/calendar', icon: 'calendar', order_index: 3, role: 'all' },
    { name: 'Reports', path: '/reports', icon: 'chart-bar', order_index: 4, role: 'admin' },
    { name: 'Users', path: '/master/users', icon: 'users', order_index: 5, role: 'admin' },
    { name: 'Projects', path: '/master/projects', icon: 'folder', order_index: 6, role: 'admin' },
    { name: 'Priority', path: '/master/priorities', icon: 'flag', order_index: 7, role: 'admin' },
    { name: 'Status', path: '/master/statuses', icon: 'tag', order_index: 8, role: 'admin' },
    { name: 'Menus', path: '/master/menus', icon: 'menu', order_index: 9, role: 'admin' }
  ]
  for (const m of menus) {
    db.prepare(`INSERT INTO menus (name, path, icon, order_index, role) VALUES (?, ?, ?, ?, ?)`).run(m.name, m.path, m.icon, m.order_index, m.role)
  }

  const now = new Date()
  const tickets = [
    { title: 'Website tidak bisa diakses sejak pagi', desc: 'Website company profile error 500 sejak jam 08.00 WIB. Sudah dicoba dari beberapa browser.', proj: 1, pri: 1, sta: 2, by: 5, to: 2 },
    { title: 'Bug pada form contact us', desc: 'Form contact us tidak mengirim email ke admin setelah user submit.', proj: 1, pri: 2, sta: 1, by: 5, to: 3 },
    { title: 'App crash saat login di Android 14', desc: 'Aplikasi langsung force close ketika tombol login ditekan di device Android 14.', proj: 2, pri: 1, sta: 2, by: 6, to: 2 },
    { title: 'Notifikasi push tidak muncul', desc: 'Setelah update v2.1.0 notifikasi push sudah tidak muncul sama sekali.', proj: 2, pri: 2, sta: 3, by: 6, to: 4 },
    { title: 'Export laporan gagal untuk data > 1000 baris', desc: 'Ketika export ke Excel dengan data lebih dari 1000 baris, proses timeout.', proj: 3, pri: 2, sta: 1, by: 5, to: 3 },
    { title: 'Hak akses modul purchasing salah', desc: 'User level supervisor bisa akses menu yang seharusnya hanya untuk manager.', proj: 3, pri: 3, sta: 4, by: 6, to: 4 },
    { title: 'Server staging down', desc: 'Server staging tidak bisa diakses via SSH maupun browser.', proj: 4, pri: 1, sta: 5, by: 1, to: 2 },
    { title: 'Bandwidth internet kantor lambat', desc: 'Koneksi internet di lantai 3 sangat lambat sejak kemarin sore.', proj: 4, pri: 3, sta: 2, by: 1, to: 3 },
    { title: 'SSL certificate akan expired 7 hari lagi', desc: 'Certificate untuk domain utama akan expired tanggal 19 Juni 2026.', proj: 4, pri: 2, sta: 1, by: 1, to: 4 },
    { title: 'Tampilan mobile tidak responsive', desc: 'Halaman produk pada mobile view berantakan di iPhone SE.', proj: 1, pri: 3, sta: 1, by: 5, to: 3 }
  ]

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i]
    const num = `TKT-${String(i + 1).padStart(4, '0')}`
    const daysAgo = Math.floor(Math.random() * 14)
    const created = new Date(now.getTime() - daysAgo * 86400000).toISOString()
    const pri = db.prepare('SELECT sla_hours FROM priorities WHERE id = ?').get(t.pri) as any
    const due = new Date(new Date(created).getTime() + pri.sla_hours * 3600000).toISOString()
    const breached = new Date(due) < now && t.sta < 4 ? 1 : 0

    db.prepare(`
      INSERT INTO tickets (ticket_number, title, description, project_id, priority_id, status_id, created_by, assigned_to, due_date, sla_breached, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(num, t.title, t.desc, t.proj, t.pri, t.sta, t.by, t.to, due, breached, created, created)

    db.prepare(`INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(i + 1, t.to, 'Sudah kami terima dan sedang dalam pengecekan. Mohon ditunggu.', 0, new Date(new Date(created).getTime() + 3600000).toISOString())
    if (i % 3 === 0) {
      db.prepare(`INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(i + 1, t.to, 'Catatan internal: sudah eskalasi ke tim infrastruktur.', 1, new Date(new Date(created).getTime() + 7200000).toISOString())
    }
  }

  console.log('[DB] Seed completed')
}

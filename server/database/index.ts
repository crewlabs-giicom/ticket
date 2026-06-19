import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDb(): mysql.Pool {
  if (pool) return pool
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ticketing',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+00:00',
  })
  initDb()
  return pool
}

async function initDb() {
  const db = pool!
  try {
    await migrate(db)
    await seed(db)
  } catch (err) {
    console.error('[DB] initDb failed:', err)
  }
}

async function migrate(db: mysql.Pool) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','staff','customer') NOT NULL DEFAULT 'staff',
      avatar VARCHAR(255),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('active','on_hold','completed') NOT NULL DEFAULT 'active',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  // Add status column to existing databases that pre-date this migration
  await db.execute(`ALTER TABLE projects ADD COLUMN status ENUM('active','on_hold','completed') NOT NULL DEFAULT 'active'`).catch(() => {})

  await db.execute(`
    CREATE TABLE IF NOT EXISTS priorities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
      order_index INT NOT NULL DEFAULT 0,
      sla_hours INT NOT NULL DEFAULT 24,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
      order_index INT NOT NULL DEFAULT 0,
      is_resolved TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_number VARCHAR(20) UNIQUE NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      project_id INT NOT NULL,
      priority_id INT NOT NULL,
      status_id INT NOT NULL,
      created_by INT NOT NULL,
      assigned_to INT,
      due_date DATETIME,
      sla_breached TINYINT(1) NOT NULL DEFAULT 0,
      resolved_at DATETIME,
      closed_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (priority_id) REFERENCES priorities(id),
      FOREIGN KEY (status_id) REFERENCES ticket_statuses(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      is_internal TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT,
      response_id INT,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      size INT,
      uploaded_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (response_id) REFERENCES ticket_responses(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      ticket_id INT,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      path VARCHAR(255) NOT NULL,
      icon VARCHAR(100) NOT NULL DEFAULT 'i-heroicons-home',
      order_index INT NOT NULL DEFAULT 0,
      role VARCHAR(50) NOT NULL DEFAULT 'all',
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status ENUM('backlog','todo','in_progress','review','done') NOT NULL DEFAULT 'backlog',
      position INT NOT NULL DEFAULT 0,
      assigned_to INT,
      created_by INT NOT NULL,
      due_date DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      referenced_ticket_id INT NOT NULL,
      relation_type ENUM('recurring','duplicate') NOT NULL DEFAULT 'recurring',
      note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (referenced_ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      read_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `)

  // Add task_id and subsystem to tickets if not present
  try {
    await db.execute(`ALTER TABLE tickets ADD COLUMN task_id INT REFERENCES tasks(id)`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE tickets ADD COLUMN subsystem VARCHAR(100)`)
  } catch {}
}

async function seed(db: mysql.Pool) {
  const [rows] = await db.execute('SELECT COUNT(*) as c FROM users')
  const count = (rows as any[])[0].c
  if (count > 0) return

  const demoPass = 'demo_password_hashed'

  const users = [
    ['Admin Utama', 'admin@ticketing.com', demoPass, 'admin'],
    ['Budi Santoso', 'budi@ticketing.com', demoPass, 'staff'],
    ['Siti Rahayu', 'siti@ticketing.com', demoPass, 'staff'],
    ['Ahmad Fauzi', 'ahmad@ticketing.com', demoPass, 'staff'],
    ['PT Maju Jaya', 'customer1@example.com', demoPass, 'customer'],
    ['CV Berkah', 'customer2@example.com', demoPass, 'customer'],
  ]
  for (const u of users) {
    await db.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', u)
  }

  const priorities = [
    ['Critical', '#ef4444', 1, 4],
    ['High', '#f97316', 2, 24],
    ['Medium', '#f59e0b', 3, 72],
    ['Low', '#22c55e', 4, 168],
  ]
  for (const p of priorities) {
    await db.execute('INSERT INTO priorities (name, color, order_index, sla_hours) VALUES (?, ?, ?, ?)', p)
  }

  const statuses = [
    ['Open', '#6366f1', 1, 0],
    ['In Progress', '#3b82f6', 2, 0],
    ['Waiting Customer', '#f59e0b', 3, 0],
    ['Resolved', '#22c55e', 4, 1],
    ['Closed', '#64748b', 5, 1],
  ]
  for (const s of statuses) {
    await db.execute('INSERT INTO ticket_statuses (name, color, order_index, is_resolved) VALUES (?, ?, ?, ?)', s)
  }

  const projects = [
    ['Website Company Profile', 'Maintenance website utama perusahaan'],
    ['Aplikasi Mobile', 'Development aplikasi mobile iOS dan Android'],
    ['ERP System', 'Implementasi dan support ERP'],
    ['IT Infrastructure', 'Pengelolaan server dan jaringan'],
  ]
  for (const p of projects) {
    await db.execute('INSERT INTO projects (name, description) VALUES (?, ?)', p)
  }

  const menus = [
    ['Dashboard', '/', 'dashboard', 1, 'all'],
    ['Projects', '/projects', 'folder', 2, 'all'],
    ['Tasks', '/tasks', 'check-square', 3, 'all'],
    ['Tickets', '/tickets', 'ticket', 4, 'all'],
    ['Workload', '/workload', 'users', 5, 'admin'],
    ['Kalender', '/calendar', 'calendar', 6, 'all'],
    ['Reports', '/reports', 'chart-bar', 7, 'admin'],
    ['Users', '/master/users', 'users', 8, 'admin'],
    ['Master Projects', '/master/projects', 'folder', 9, 'admin'],
    ['Priority', '/master/priorities', 'flag', 10, 'admin'],
    ['Status', '/master/statuses', 'tag', 11, 'admin'],
    ['Menus', '/master/menus', 'menu', 12, 'admin'],
  ]
  for (const m of menus) {
    await db.execute('INSERT INTO menus (name, path, icon, order_index, role) VALUES (?, ?, ?, ?, ?)', m)
  }

  const now = new Date()
  const ticketData = [
    { title: 'Website tidak bisa diakses sejak pagi', desc: 'Website company profile error 500 sejak jam 08.00 WIB. Sudah dicoba dari beberapa browser.', proj: 1, pri: 1, sta: 2, by: 5, to: 2 },
    { title: 'Bug pada form contact us', desc: 'Form contact us tidak mengirim email ke admin setelah user submit.', proj: 1, pri: 2, sta: 1, by: 5, to: 3 },
    { title: 'App crash saat login di Android 14', desc: 'Aplikasi langsung force close ketika tombol login ditekan di device Android 14.', proj: 2, pri: 1, sta: 2, by: 6, to: 2 },
    { title: 'Notifikasi push tidak muncul', desc: 'Setelah update v2.1.0 notifikasi push sudah tidak muncul sama sekali.', proj: 2, pri: 2, sta: 3, by: 6, to: 4 },
    { title: 'Export laporan gagal untuk data > 1000 baris', desc: 'Ketika export ke Excel dengan data lebih dari 1000 baris, proses timeout.', proj: 3, pri: 2, sta: 1, by: 5, to: 3 },
    { title: 'Hak akses modul purchasing salah', desc: 'User level supervisor bisa akses menu yang seharusnya hanya untuk manager.', proj: 3, pri: 3, sta: 4, by: 6, to: 4 },
    { title: 'Server staging down', desc: 'Server staging tidak bisa diakses via SSH maupun browser.', proj: 4, pri: 1, sta: 5, by: 1, to: 2 },
    { title: 'Bandwidth internet kantor lambat', desc: 'Koneksi internet di lantai 3 sangat lambat sejak kemarin sore.', proj: 4, pri: 3, sta: 2, by: 1, to: 3 },
    { title: 'SSL certificate akan expired 7 hari lagi', desc: 'Certificate untuk domain utama akan expired tanggal 19 Juni 2026.', proj: 4, pri: 2, sta: 1, by: 1, to: 4 },
    { title: 'Tampilan mobile tidak responsive', desc: 'Halaman produk pada mobile view berantakan di iPhone SE.', proj: 1, pri: 3, sta: 1, by: 5, to: 3 },
  ]

  const slaMap: Record<number, number> = { 1: 4, 2: 24, 3: 72, 4: 168 }

  for (let i = 0; i < ticketData.length; i++) {
    const t = ticketData[i]
    const num = `TKT-${String(i + 1).padStart(4, '0')}`
    const daysAgo = Math.floor(Math.random() * 14)
    const created = new Date(now.getTime() - daysAgo * 86400000)
    const slaHours = slaMap[t.pri] || 24
    const due = new Date(created.getTime() + slaHours * 3600000)
    const breached = due < now && t.sta < 4 ? 1 : 0

    const toMySQL = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

    const [ticketResult] = await db.execute(
      `INSERT INTO tickets (ticket_number, title, description, project_id, priority_id, status_id, created_by, assigned_to, due_date, sla_breached, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [num, t.title, t.desc, t.proj, t.pri, t.sta, t.by, t.to, toMySQL(due), breached, toMySQL(created), toMySQL(created)]
    )
    const ticketId = (ticketResult as mysql.ResultSetHeader).insertId

    const resp1Time = new Date(created.getTime() + 3600000)
    await db.execute(
      'INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal, created_at) VALUES (?, ?, ?, ?, ?)',
      [ticketId, t.to, 'Sudah kami terima dan sedang dalam pengecekan. Mohon ditunggu.', 0, toMySQL(resp1Time)]
    )
    if (i % 3 === 0) {
      const resp2Time = new Date(created.getTime() + 7200000)
      await db.execute(
        'INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal, created_at) VALUES (?, ?, ?, ?, ?)',
        [ticketId, t.to, 'Catatan internal: sudah eskalasi ke tim infrastruktur.', 1, toMySQL(resp2Time)]
      )
    }
  }

  console.log('[DB] Seed completed')
}

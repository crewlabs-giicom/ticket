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
    timezone: '+07:00',
    dateStrings: true,
  })
  // Set session timezone on every new connection so NOW() returns WIB time
  pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+07:00'")
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
  await db.execute(`ALTER TABLE projects ADD COLUMN sort_order INT NOT NULL DEFAULT 0`).catch(() => {})

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
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      task_comment_id INT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      size INT,
      uploaded_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (task_comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,
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
      task_id INT,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
    CREATE TABLE IF NOT EXISTS system_menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module VARCHAR(100) NOT NULL,
      type ENUM('master','transaction','report') NULL,
      name VARCHAR(200) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      order_index INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute(`ALTER TABLE system_menus ADD COLUMN project_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE system_menus ADD CONSTRAINT fk_sysmenu_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL`).catch(() => {})

  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      project_role ENUM('admin','member') NOT NULL DEFAULT 'member',
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  await db.execute(`ALTER TABLE project_members ADD COLUMN IF NOT EXISTS project_role ENUM('admin','member') NOT NULL DEFAULT 'member'`).catch(() => {})

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_message_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      size INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE
    )
  `)

  // Allow message to be empty (when only attachments sent)
  try { await db.execute(`ALTER TABLE ticket_messages MODIFY COLUMN message TEXT NULL`) } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_chat_transcripts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL UNIQUE,
      transcript JSON NOT NULL,
      message_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `)

  // Add system_menu_id to tickets and tasks if not present
  try { await db.execute(`ALTER TABLE tickets ADD COLUMN system_menu_id INT NULL REFERENCES system_menus(id)`) } catch {}
  try { await db.execute(`ALTER TABLE tasks ADD COLUMN system_menu_id INT NULL REFERENCES system_menus(id)`) } catch {}

  // Task time tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_timelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      started_at DATETIME NOT NULL,
      stopped_at DATETIME,
      duration_seconds INT,
      note VARCHAR(500),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tl_task (task_id)
    )
  `)

  // Ticket time tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_timelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      user_id INT NOT NULL,
      started_at DATETIME NOT NULL,
      stopped_at DATETIME,
      duration_seconds INT,
      note VARCHAR(500),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ttl_ticket (ticket_id)
    )
  `)

  // Close zombie ticket timelogs (> 12 hours open)
  try {
    await db.execute(
      `UPDATE ticket_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE stopped_at IS NULL AND started_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)`
    )
  } catch {}

  // Add completed_at to tasks (for lifecycle SLA)
  try { await db.execute(`ALTER TABLE tasks ADD COLUMN completed_at DATETIME NULL`) } catch {}
  // Add is_archived for auto-archive feature
  try { await db.execute(`ALTER TABLE tasks ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0`) } catch {}

  // Close zombie timelogs (> 12 hours open = likely abandoned)
  try {
    await db.execute(
      `UPDATE task_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE stopped_at IS NULL AND started_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)`
    )
  } catch {}

  // Add task_id and subsystem to tickets if not present
  try {
    await db.execute(`ALTER TABLE tickets ADD COLUMN task_id INT REFERENCES tasks(id)`)
  } catch {}
  try {
    await db.execute(`ALTER TABLE tickets ADD COLUMN subsystem VARCHAR(100)`)
  } catch {}
  // Add task_id to notifications if not present
  try {
    await db.execute(`ALTER TABLE notifications ADD COLUMN task_id INT, ADD CONSTRAINT fk_notif_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`)
  } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_checklist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      is_checked TINYINT(1) NOT NULL DEFAULT 0,
      order_index INT NOT NULL DEFAULT 0,
      created_by INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type ENUM('ticket','task') NOT NULL,
      entity_id INT NOT NULL,
      action VARCHAR(100) NOT NULL,
      from_value VARCHAR(500),
      to_value VARCHAR(500),
      label VARCHAR(500) NOT NULL,
      user_id INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_entity (entity_type, entity_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_pinned_tabs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      ticket_id INT NOT NULL,
      ticket_number VARCHAR(50) NOT NULL DEFAULT '',
      title VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_ticket (user_id, ticket_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_pinned_pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      path VARCHAR(200) NOT NULL,
      label VARCHAR(200) NOT NULL DEFAULT '',
      icon VARCHAR(50) NOT NULL DEFAULT 'grid',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_page (user_id, path),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_participants (
      ticket_id INT NOT NULL,
      user_id INT NOT NULL,
      invited_by INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ticket_id, user_id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS task_participants (
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      invited_by INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      title      VARCHAR(255) NOT NULL DEFAULT 'Catatan',
      color      VARCHAR(20)  NOT NULL DEFAULT '#fef08a',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_wl_user (user_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      wishlist_id INT NOT NULL,
      content     TEXT NOT NULL,
      is_checked  TINYINT(1) NOT NULL DEFAULT 0,
      order_index INT NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
      INDEX idx_wli_wishlist (wishlist_id)
    )
  `)
  // Add pin columns to wishlists (safe to run multiple times)
  await db.execute(`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS is_pinned TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {})
  await db.execute(`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS pin_x INT DEFAULT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS pin_y INT DEFAULT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS is_minimized TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {})

  // === PRD / Request workflow ===

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      project_id INT NOT NULL,
      status ENUM('draft','in_review','approved','in_progress','done') NOT NULL DEFAULT 'draft',
      current_version_id INT NULL,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prd_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prd_id INT NOT NULL,
      version_number INT NOT NULL DEFAULT 1,
      background TEXT,
      goals TEXT,
      scope_in TEXT,
      scope_out TEXT,
      requirements TEXT,
      technical_approach TEXT,
      changelog TEXT,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  // Add FK current_version_id after prd_versions exists
  await db.execute(`ALTER TABLE prds ADD CONSTRAINT fk_prd_current_version FOREIGN KEY (current_version_id) REFERENCES prd_versions(id) ON DELETE SET NULL`).catch(() => {})

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prd_milestones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prd_id INT NOT NULL,
      prd_version_id INT NOT NULL,
      name VARCHAR(500) NOT NULL,
      due_date DATE,
      \`order\` INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE CASCADE,
      FOREIGN KEY (prd_version_id) REFERENCES prd_versions(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      requester_id INT NOT NULL,
      project_id INT NOT NULL,
      urgency ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
      status ENUM('under_review','approved','in_progress','done','rejected','standalone') NOT NULL DEFAULT 'under_review',
      prd_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE SET NULL,
      INDEX idx_req_prd (prd_id),
      INDEX idx_req_status (status)
    )
  `)

  // Extend tasks with PRD foreign keys
  await db.execute(`ALTER TABLE tasks ADD COLUMN prd_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tasks ADD COLUMN prd_version_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tasks ADD COLUMN milestone_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tasks ADD CONSTRAINT fk_task_prd FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE SET NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tasks ADD CONSTRAINT fk_task_prd_version FOREIGN KEY (prd_version_id) REFERENCES prd_versions(id) ON DELETE SET NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tasks ADD CONSTRAINT fk_task_milestone FOREIGN KEY (milestone_id) REFERENCES prd_milestones(id) ON DELETE SET NULL`).catch(() => {})

  // Add Requests & PRDs menu items (idempotent)
  await db.execute(`INSERT INTO menus (name, path, icon, order_index, role) SELECT 'Requests','/requests','inbox',3,'all' WHERE NOT EXISTS (SELECT 1 FROM menus WHERE path='/requests')`).catch(() => {})
  await db.execute(`INSERT INTO menus (name, path, icon, order_index, role) SELECT 'PRDs','/prds','document',4,'all' WHERE NOT EXISTS (SELECT 1 FROM menus WHERE path='/prds')`).catch(() => {})

  // === QC (Quality Control) ===

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_template_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      qc_template_id INT NOT NULL,
      item_name VARCHAR(500) NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      FOREIGN KEY (qc_template_id) REFERENCES qc_templates(id) ON DELETE CASCADE,
      INDEX idx_qcti_template (qc_template_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      sequence INT NOT NULL DEFAULT 1,
      qc_template_id INT,
      status ENUM('active','completed') NOT NULL DEFAULT 'active',
      created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (qc_template_id) REFERENCES qc_templates(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      INDEX idx_qcf_task (task_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_form_checkers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      qc_form_id INT NOT NULL,
      user_id INT NOT NULL,
      is_done TINYINT(1) NOT NULL DEFAULT 0,
      done_at DATETIME,
      UNIQUE KEY uk_form_checker (qc_form_id, user_id),
      FOREIGN KEY (qc_form_id) REFERENCES qc_forms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_checklist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      qc_form_id INT NOT NULL,
      checker_id INT NOT NULL,
      item_name VARCHAR(500) NOT NULL,
      source ENUM('template','manual') NOT NULL DEFAULT 'template',
      is_checked TINYINT(1) NOT NULL DEFAULT 0,
      checked_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qc_form_id) REFERENCES qc_forms(id) ON DELETE CASCADE,
      FOREIGN KEY (checker_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_qcitem_form (qc_form_id),
      INDEX idx_qcitem_checker (checker_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_checklist_item_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      qc_checklist_item_id INT NOT NULL,
      ticket_id INT NOT NULL,
      FOREIGN KEY (qc_checklist_item_id) REFERENCES qc_checklist_items(id) ON DELETE CASCADE,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      INDEX idx_qcit_item (qc_checklist_item_id),
      INDEX idx_qcit_ticket (ticket_id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS qc_timelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      qc_form_id INT NOT NULL,
      user_id INT NOT NULL,
      started_at DATETIME NOT NULL,
      stopped_at DATETIME,
      duration_seconds INT,
      note VARCHAR(500),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qc_form_id) REFERENCES qc_forms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_qctl_form (qc_form_id)
    )
  `)

  // Close zombie QC timelogs (> 12 hours open)
  try {
    await db.execute(
      `UPDATE qc_timelogs SET stopped_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE stopped_at IS NULL AND started_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)`
    )
  } catch {}

  // PRD participants
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prd_participants (
      prd_id INT NOT NULL,
      user_id INT NOT NULL,
      invited_by INT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (prd_id, user_id),
      FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // Menu tree: add parent_id (NULL = top-level or folder, non-NULL = child of another menu)
  await db.execute(`ALTER TABLE menus ADD COLUMN parent_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE menus MODIFY COLUMN path VARCHAR(255) NULL`).catch(() => {})

  // Add QC columns to tickets
  await db.execute(`ALTER TABLE tickets ADD COLUMN source ENUM('user','qc') NOT NULL DEFAULT 'user'`).catch(() => {})
  await db.execute(`ALTER TABLE tickets ADD COLUMN qc_checklist_item_id INT NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tickets ADD COLUMN resolution_type ENUM('fixed','mismatch_requirement') NULL`).catch(() => {})
  await db.execute(`ALTER TABLE tickets ADD CONSTRAINT fk_ticket_qc_item FOREIGN KEY (qc_checklist_item_id) REFERENCES qc_checklist_items(id) ON DELETE SET NULL`).catch(() => {})

  // Add in_qc to tasks status enum (safe: MySQL ALTER ENUM is non-locking for ADD)
  await db.execute(`ALTER TABLE tasks MODIFY COLUMN status ENUM('backlog','todo','in_progress','review','in_qc','done') NOT NULL DEFAULT 'backlog'`).catch(() => {})

  // QC Template menu item (admin only)
  await db.execute(`INSERT INTO menus (name, path, icon, order_index, role) SELECT 'Template QC','/master/qc-templates','clipboard-check',13,'admin' WHERE NOT EXISTS (SELECT 1 FROM menus WHERE path='/master/qc-templates')`).catch(() => {})

  // Pinned QC form tabs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_pinned_qc_tabs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      qc_form_id INT NOT NULL,
      task_title VARCHAR(500) NOT NULL DEFAULT '',
      sequence INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_qc (user_id, qc_form_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (qc_form_id) REFERENCES qc_forms(id) ON DELETE CASCADE
    )
  `)
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

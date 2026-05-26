import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

let _db: Database.Database | null = null

export function db() {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('busy_timeout = 5000')
  migrate(_db)
  return _db
}

function migrate(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY,
      company TEXT NOT NULL,
      sector TEXT,
      country TEXT,
      region TEXT,
      tier TEXT,
      status TEXT,
      stage TEXT DEFAULT 'دعوة',
      invite_sent INTEGER DEFAULT 0,
      rfi_sent INTEGER DEFAULT 0,
      initial_receipt INTEGER DEFAULT 0,
      response_received INTEGER DEFAULT 0,
      extension_request INTEGER DEFAULT 0,
      platform TEXT,
      rfi_delivery TEXT,
      workshop_attendance TEXT,
      workshop_date TEXT,
      workshop_time TEXT,
      notes TEXT,
      website TEXT,
      latitude REAL,
      longitude REAL,
      strategic_value INTEGER DEFAULT 5,
      activation_score INTEGER DEFAULT 0,
      impact_score INTEGER DEFAULT 0,
      tags TEXT,
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_partners_stage ON partners(stage);
    CREATE INDEX IF NOT EXISTS idx_partners_sector ON partners(sector);
    CREATE INDEX IF NOT EXISTS idx_partners_country ON partners(country);
    CREATE INDEX IF NOT EXISTS idx_partners_tier ON partners(tier);
    CREATE INDEX IF NOT EXISTS idx_partners_activation ON partners(activation_score DESC);

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      name TEXT,
      title TEXT,
      email TEXT,
      phone TEXT,
      linkedin TEXT,
      is_representative INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_partner ON contacts(partner_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      actor TEXT,
      occurred_at TEXT DEFAULT (datetime('now')),
      meta TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_activities_partner ON activities(partner_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(occurred_at DESC);

    CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target REAL,
      actual REAL DEFAULT 0,
      unit TEXT,
      period TEXT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      estimated_value REAL,
      probability INTEGER,
      stage TEXT DEFAULT 'استكشاف',
      status TEXT DEFAULT 'مفتوحة',
      expected_close_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_opp_partner ON opportunities(partner_id);
    CREATE INDEX IF NOT EXISTS idx_opp_status ON opportunities(status);

    CREATE TABLE IF NOT EXISTS licensed_companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      license_type TEXT,
      issued_at TEXT,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS impact_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taken_at TEXT DEFAULT (datetime('now')),
      total_partners INTEGER,
      activated INTEGER,
      response_rate INTEGER,
      workshops_held INTEGER,
      avg_activation INTEGER,
      open_opportunities INTEGER,
      pipeline_value REAL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      partner_id INTEGER,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime TEXT,
      size INTEGER,
      data BLOB NOT NULL,
      uploaded_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_attach_partner ON attachments(partner_id);

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      success INTEGER DEFAULT 0,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_login_id ON login_attempts(identifier, created_at DESC);
  `)

  // Idempotent column additions for upgrades of existing databases
  const addColumn = (table: string, col: string, type: string) => {
    try { d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`) } catch {}
  }
  addColumn('partners', 'region', 'TEXT')
  addColumn('partners', 'website', 'TEXT')
  addColumn('partners', 'latitude', 'REAL')
  addColumn('partners', 'longitude', 'REAL')
  addColumn('partners', 'tags', 'TEXT')
  addColumn('partners', 'assigned_to', 'TEXT')
  addColumn('opportunities', 'stage', `TEXT DEFAULT 'استكشاف'`)
  addColumn('opportunities', 'expected_close_date', 'TEXT')
  addColumn('opportunities', 'updated_at', 'TEXT')
  addColumn('activities', 'actor', 'TEXT')
  addColumn('users', 'partner_id', 'INTEGER')
  addColumn('licensed_companies', 'license_type', 'TEXT')
  addColumn('licensed_companies', 'issued_at', 'TEXT')
  addColumn('licensed_companies', 'expires_at', 'TEXT')
}

export type Partner = {
  id: number
  company: string
  sector: string | null
  country: string | null
  region: string | null
  tier: string | null
  status: string | null
  stage: string
  invite_sent: number
  rfi_sent: number
  initial_receipt: number
  response_received: number
  extension_request: number
  platform: string | null
  rfi_delivery: string | null
  workshop_attendance: string | null
  workshop_date: string | null
  workshop_time: string | null
  notes: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  strategic_value: number
  activation_score: number
  impact_score: number
  tags: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export type Contact = {
  id: number
  partner_id: number
  name: string | null
  title: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  is_representative: number
}

export type Activity = {
  id: number
  partner_id: number
  kind: string
  title: string
  description: string | null
  actor: string | null
  occurred_at: string
  meta: string | null
}

export type KPI = {
  id: number
  partner_id: number | null
  name: string
  target: number | null
  actual: number
  unit: string | null
  period: string | null
  category: string | null
}

export type Opportunity = {
  id: number
  partner_id: number | null
  title: string
  description: string | null
  estimated_value: number | null
  probability: number | null
  stage: string
  status: string
  expected_close_date: string | null
  created_at: string
  updated_at: string
}

export type User = {
  id: number
  email: string
  name: string | null
  password_hash: string
  role: 'admin' | 'manager' | 'viewer' | 'rep'
  partner_id: number | null
  active: number
  created_at: string
  last_login: string | null
}

export type AuditLog = {
  id: number
  user_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: string | null
  ip: string | null
  created_at: string
}

export const STAGES = ['دعوة', 'RFI', 'استلام أولي', 'رد', 'ورشة عمل', 'تفعيل', 'إنجاز'] as const
export type Stage = typeof STAGES[number]

export const OPPORTUNITY_STAGES = ['استكشاف', 'تأهيل', 'عرض', 'تفاوض', 'إغلاق فائز', 'إغلاق خاسر'] as const
export type OpportunityStage = typeof OPPORTUNITY_STAGES[number]

export const ROLES = ['admin', 'manager', 'viewer', 'rep'] as const
export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدير النظام',
  manager: 'مدير شراكات',
  viewer: 'مُطّلع',
  rep: 'ممثل شريك',
}

export function computeActivationScore(p: Partial<Partner>): number {
  let s = 0
  if (p.invite_sent) s += 10
  if (p.rfi_sent) s += 15
  if (p.initial_receipt) s += 15
  if (p.response_received) s += 20
  if (p.workshop_attendance && /حضور|تم/i.test(p.workshop_attendance)) s += 25
  if (p.status && /تم الرد|تفعيل|نجاح/.test(p.status)) s += 15
  return Math.min(100, s)
}

export function deriveStage(p: Partial<Partner>): Stage {
  if (p.workshop_attendance && /حضور|تم/i.test(p.workshop_attendance)) return 'تفعيل'
  if (p.workshop_date) return 'ورشة عمل'
  if (p.response_received) return 'رد'
  if (p.initial_receipt) return 'استلام أولي'
  if (p.rfi_sent) return 'RFI'
  if (p.invite_sent) return 'دعوة'
  return 'دعوة'
}

export function audit(action: string, opts: {
  user?: string
  type?: string
  id?: string | number | bigint
  details?: string
  ip?: string
} = {}) {
  try {
    db().prepare(`INSERT INTO audit_log (user_email, action, target_type, target_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(opts.user || null, action, opts.type || null, opts.id != null ? String(opts.id) : null, opts.details || null, opts.ip || null)
  } catch {} // best-effort
}

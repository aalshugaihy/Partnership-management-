import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

let _db: Database.Database | null = null

export function db() {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
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
      strategic_value INTEGER DEFAULT 5,
      activation_score INTEGER DEFAULT 0,
      impact_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      occurred_at TEXT DEFAULT (datetime('now')),
      meta TEXT
    );

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
      status TEXT DEFAULT 'مفتوحة',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS licensed_companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

export type Partner = {
  id: number
  company: string
  sector: string | null
  country: string | null
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
  strategic_value: number
  activation_score: number
  impact_score: number
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
  status: string
  created_at: string
}

export const STAGES = ['دعوة', 'RFI', 'استلام أولي', 'رد', 'ورشة عمل', 'تفعيل', 'إنجاز'] as const
export type Stage = typeof STAGES[number]

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

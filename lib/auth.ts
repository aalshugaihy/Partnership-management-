import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db, audit, User, Role } from './db'

const SESSION_COOKIE = 'pm_session'
const DEFAULT_ADMIN_EMAIL = 'admin@local'
const DEFAULT_ADMIN_PASSWORD = 'admin1234'

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set to a string >= 16 chars in production')
    }
    return 'dev-secret-do-not-use-in-production-please'
  }
  return s
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function signSession(payload: string): string {
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex').slice(0, 24)
  return `${payload}.${sig}`
}

export function verifySession(signed: string | undefined): { email: string; role: Role } | null {
  if (!signed) return null
  const parts = signed.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex').slice(0, 24)
  if (sig !== expected) return null
  const sub = Buffer.from(payload, 'base64url').toString('utf-8')
  const [email, role, ts] = sub.split('|')
  if (!email || !role) return null
  // Optional: session ttl (default 7 days)
  const issued = parseInt(ts || '0', 10)
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000
  if (!issued || Date.now() - issued > maxAgeMs) return null
  return { email, role: role as Role }
}

function buildSessionPayload(email: string, role: Role): string {
  return Buffer.from(`${email}|${role}|${Date.now()}`).toString('base64url')
}

export function ensureDefaultAdmin() {
  const d = db()
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
  const adminPwd = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
  const existing = d.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any
  if (!existing) {
    d.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run(adminEmail, 'مدير النظام', hashPassword(adminPwd))
  }
}

function isThrottled(identifier: string): { throttled: boolean; retryAfterSec?: number } {
  const d = db()
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  const fails = d.prepare(`
    SELECT COUNT(*) AS n FROM login_attempts WHERE identifier = ? AND success = 0 AND created_at > ?
  `).get(identifier, since) as any
  if (fails.n >= 5) return { throttled: true, retryAfterSec: 600 }
  return { throttled: false }
}

function recordAttempt(identifier: string, success: boolean, ip?: string) {
  try {
    db().prepare(`INSERT INTO login_attempts (identifier, success, ip) VALUES (?, ?, ?)`)
      .run(identifier, success ? 1 : 0, ip || null)
  } catch {}
}

export type LoginResult =
  | { ok: true; cookie: string; user: { email: string; role: Role; name: string | null } }
  | { ok: false; reason: 'throttled' | 'invalid' | 'inactive'; retryAfterSec?: number }

export function login(emailOrPassword: string, maybePassword?: string, ip?: string): LoginResult {
  ensureDefaultAdmin()
  // Backwards compat: if only one arg passed, treat as password against default admin.
  let email: string
  let password: string
  if (maybePassword === undefined) {
    email = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
    password = emailOrPassword
  } else {
    email = (emailOrPassword || '').trim().toLowerCase()
    password = maybePassword
  }

  const throttle = isThrottled(email)
  if (throttle.throttled) return { ok: false, reason: 'throttled', retryAfterSec: throttle.retryAfterSec }

  const user = db().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
  if (!user || user.password_hash !== hashPassword(password)) {
    recordAttempt(email, false, ip)
    return { ok: false, reason: 'invalid' }
  }
  if (!user.active) {
    recordAttempt(email, false, ip)
    return { ok: false, reason: 'inactive' }
  }
  recordAttempt(email, true, ip)
  db().prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id)
  audit('login', { user: user.email, ip })
  const cookie = signSession(buildSessionPayload(user.email, user.role))
  return { ok: true, cookie, user: { email: user.email, role: user.role, name: user.name } }
}

export function currentUser(): { email: string; role: Role } | null {
  if (process.env.DISABLE_AUTH === '1') return { email: 'dev@local', role: 'admin' }
  const c = cookies().get(SESSION_COOKIE)?.value
  return verifySession(c)
}

export function currentUserFull(): { email: string; role: Role; name: string | null; partner_id: number | null } | null {
  const u = currentUser()
  if (!u) return null
  const row = db().prepare(`SELECT email, role, name, partner_id FROM users WHERE email = ?`).get(u.email) as any
  return row || u as any
}

export function isAuthenticated(): boolean {
  return currentUser() !== null
}

export function requireAuth(nextPath?: string) {
  if (!isAuthenticated()) {
    const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/login${qs}`)
  }
}

export function requireRole(...roles: Role[]) {
  const u = currentUser()
  if (!u) redirect('/login')
  if (!roles.includes(u.role)) redirect('/?forbidden=1')
}

export function requireAuthApi(): NextResponse | null {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export function requireRoleApi(...roles: Role[]): NextResponse | null {
  const u = currentUser()
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!roles.includes(u.role)) return NextResponse.json({ error: 'forbidden', need: roles }, { status: 403 })
  return null
}

export { SESSION_COOKIE }

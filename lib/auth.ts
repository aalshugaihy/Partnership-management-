import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const SESSION_COOKIE = 'pm_session'
const DEFAULT_PASSWORD = 'admin1234'

function passwordHash(): string {
  return crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD).digest('hex')
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || 'change-me-in-production'
}

export function sign(value: string): string {
  const sig = crypto.createHmac('sha256', sessionSecret()).update(value).digest('hex').slice(0, 24)
  return `${value}.${sig}`
}

function verify(signed: string | undefined): boolean {
  if (!signed) return false
  const [val, sig] = signed.split('.')
  if (!val || !sig) return false
  const expected = crypto.createHmac('sha256', sessionSecret()).update(val).digest('hex').slice(0, 24)
  return sig === expected && val === passwordHash()
}

export function login(password: string): { ok: boolean; cookie?: string } {
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  if (hash !== passwordHash()) return { ok: false }
  return { ok: true, cookie: sign(hash) }
}

export function isAuthenticated(): boolean {
  if (process.env.DISABLE_AUTH === '1') return true
  const c = cookies().get(SESSION_COOKIE)?.value
  return verify(c)
}

// For server components/pages: redirect to /login if not authenticated.
export function requireAuth(nextPath?: string) {
  if (!isAuthenticated()) {
    const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
    redirect(`/login${qs}`)
  }
}

// For API routes: return a 401 response if not authenticated.
export function requireAuthApi(): NextResponse | null {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export { SESSION_COOKIE }

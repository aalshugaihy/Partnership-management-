import { NextRequest, NextResponse } from 'next/server'
import { login, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const r = login(password || '')
  if (!r.ok) return NextResponse.json({ error: 'invalid' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, r.cookie!, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

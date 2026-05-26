import { NextRequest, NextResponse } from 'next/server'
import { login, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || undefined
  const result = body.email
    ? login(String(body.email), String(body.password || ''), ip)
    : login(String(body.password || ''), undefined, ip)

  if (!result.ok) {
    if (result.reason === 'throttled') {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات. حاول بعد قليل.', retryAfterSec: result.retryAfterSec },
        { status: 429 }
      )
    }
    if (result.reason === 'inactive') {
      return NextResponse.json({ error: 'الحساب موقوف' }, { status: 403 })
    }
    return NextResponse.json({ error: 'بيانات دخول غير صحيحة' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, user: result.user })
  res.cookies.set(SESSION_COOKIE, result.cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

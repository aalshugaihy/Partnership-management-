import { NextRequest, NextResponse } from 'next/server'
import { db, audit, ROLES } from '@/lib/db'
import { requireRoleApi, hashPassword, currentUser } from '@/lib/auth'

export async function GET() {
  const g = requireRoleApi('admin'); if (g) return g
  const users = db().prepare(`SELECT id, email, name, role, active, created_at, last_login FROM users ORDER BY created_at DESC`).all()
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const g = requireRoleApi('admin'); if (g) return g
  const b = await req.json()
  const email = String(b.email || '').trim().toLowerCase()
  const password = String(b.password || '')
  const name = String(b.name || '').trim() || null
  const role = ROLES.includes(b.role) ? b.role : 'viewer'

  if (!email || !password) return NextResponse.json({ error: 'email & password required' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'كلمة المرور قصيرة جداً' }, { status: 400 })

  const partnerId = role === 'rep' && b.partner_id ? Number(b.partner_id) : null
  if (role === 'rep' && !partnerId) {
    return NextResponse.json({ error: 'ممثل الشريك يتطلب partner_id' }, { status: 400 })
  }
  try {
    db().prepare(`INSERT INTO users (email, name, password_hash, role, partner_id) VALUES (?, ?, ?, ?, ?)`)
      .run(email, name, hashPassword(password), role, partnerId)
    audit('user.create', { user: currentUser()?.email, type: 'user', id: email, details: role })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) {
      return NextResponse.json({ error: 'البريد مستخدم بالفعل' }, { status: 409 })
    }
    return NextResponse.json({ error: e?.message || 'خطأ' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const g = requireRoleApi('admin'); if (g) return g
  const b = await req.json()
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sets: string[] = []
  const args: any[] = []
  if (b.role !== undefined && ROLES.includes(b.role)) { sets.push('role = ?'); args.push(b.role) }
  if (b.active !== undefined) { sets.push('active = ?'); args.push(b.active ? 1 : 0) }
  if (b.name !== undefined) { sets.push('name = ?'); args.push(b.name) }
  if (b.password) { sets.push('password_hash = ?'); args.push(hashPassword(b.password)) }
  if (!sets.length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  args.push(b.id)
  db().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  audit('user.update', { user: currentUser()?.email, type: 'user', id: b.id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const g = requireRoleApi('admin'); if (g) return g
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  // never delete the admin user that's currently logged in
  const me = currentUser()
  const user = db().prepare(`SELECT email FROM users WHERE id = ?`).get(id) as any
  if (user && me && user.email === me.email) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 })
  }
  db().prepare(`DELETE FROM users WHERE id = ?`).run(id)
  audit('user.delete', { user: me?.email, type: 'user', id })
  return NextResponse.json({ ok: true })
}

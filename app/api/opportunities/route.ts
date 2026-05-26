import { requireAuthApi, requireRoleApi, currentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db, audit, OPPORTUNITY_STAGES } from '@/lib/db'

export async function GET(req: NextRequest) {
  const g = requireAuthApi(); if (g) return g
  const partnerId = req.nextUrl.searchParams.get('partner_id')
  const sql = `
    SELECT o.*, p.company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    ${partnerId ? 'WHERE o.partner_id = ?' : ''}
    ORDER BY o.estimated_value DESC
  `
  const rows = partnerId ? db().prepare(sql).all(partnerId) : db().prepare(sql).all()
  return NextResponse.json({ opportunities: rows })
}

export async function POST(req: NextRequest) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const b = await req.json()
  if (!b.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const stage = OPPORTUNITY_STAGES.includes(b.stage) ? b.stage : 'استكشاف'
  const res = db().prepare(`
    INSERT INTO opportunities (partner_id, title, description, estimated_value, probability, stage, status, expected_close_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.partner_id || null,
    b.title,
    b.description || null,
    b.estimated_value ?? null,
    b.probability ?? null,
    stage,
    b.status || 'مفتوحة',
    b.expected_close_date || null
  )
  audit('opportunity.create', { user: currentUser()?.email, type: 'opportunity', id: String(res.lastInsertRowid), details: b.title })
  return NextResponse.json({ ok: true, id: res.lastInsertRowid })
}

export async function PATCH(req: NextRequest) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const b = await req.json()
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sets: string[] = []
  const args: any[] = []
  for (const f of ['title', 'description', 'estimated_value', 'probability', 'stage', 'status', 'expected_close_date', 'partner_id']) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); args.push(b[f]) }
  }
  if (!sets.length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  sets.push(`updated_at = datetime('now')`)
  args.push(b.id)
  db().prepare(`UPDATE opportunities SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  audit('opportunity.update', { user: currentUser()?.email, type: 'opportunity', id: b.id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  db().prepare(`DELETE FROM opportunities WHERE id = ?`).run(id)
  audit('opportunity.delete', { user: currentUser()?.email, type: 'opportunity', id })
  return NextResponse.json({ ok: true })
}

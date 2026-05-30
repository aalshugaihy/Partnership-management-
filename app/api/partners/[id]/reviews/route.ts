import { requireAuthApi, requireRoleApi, currentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db, audit } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireAuthApi(); if (g) return g
  const rows = db().prepare(
    `SELECT * FROM review_meetings WHERE partner_id = ? ORDER BY meeting_date DESC`
  ).all(params.id)
  return NextResponse.json({ meetings: rows })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const b = await req.json()
  if (!b.meeting_date) return NextResponse.json({ error: 'meeting_date required' }, { status: 400 })

  const partnerId = Number(params.id)
  const me = currentUser()?.email || null
  const res = db().prepare(`
    INSERT INTO review_meetings (partner_id, meeting_date, attendees, outcomes, next_actions, satisfaction_score, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    partnerId,
    String(b.meeting_date),
    b.attendees || null,
    b.outcomes || null,
    b.next_actions || null,
    b.satisfaction_score != null ? Number(b.satisfaction_score) : null,
    me
  )

  // Auto-schedule next review 6 months ahead, per GEOSA methodology
  const next = new Date(b.meeting_date)
  next.setMonth(next.getMonth() + 6)
  db().prepare(`UPDATE partners SET next_review_date = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(next.toISOString().slice(0, 10), partnerId)

  // Log an activity for traceability
  db().prepare(`INSERT INTO activities (partner_id, kind, title, description, actor) VALUES (?, ?, ?, ?, ?)`)
    .run(partnerId, 'مراجعة دورية', 'اجتماع مراجعة دورية', b.outcomes || null, me)

  audit('review.create', { user: me || undefined, type: 'partner', id: String(partnerId), details: String(res.lastInsertRowid) })
  return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = requireRoleApi('admin', 'manager'); if (g) return g
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  db().prepare(`DELETE FROM review_meetings WHERE id = ? AND partner_id = ?`).run(id, params.id)
  audit('review.delete', { user: currentUser()?.email, type: 'partner', id: params.id, details: id })
  return NextResponse.json({ ok: true })
}

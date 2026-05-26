import { requireAuthApi } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const g = requireAuthApi(); if (g) return g;
  const b = await req.json()
  if (!b.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const res = db().prepare(`
    INSERT INTO opportunities (partner_id, title, description, estimated_value, probability, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    b.partner_id || null,
    b.title,
    b.description || null,
    b.estimated_value ?? null,
    b.probability ?? null,
    b.status || 'مفتوحة'
  )
  return NextResponse.json({ ok: true, id: res.lastInsertRowid })
}

export async function PATCH(req: NextRequest) {
  const g = requireAuthApi(); if (g) return g;
  const b = await req.json()
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  db().prepare(`UPDATE opportunities SET status = ? WHERE id = ?`).run(b.status, b.id)
  return NextResponse.json({ ok: true })
}

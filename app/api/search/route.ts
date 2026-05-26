import { requireAuthApi } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const g = requireAuthApi(); if (g) return g
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })
  const like = `%${q}%`
  const partners = db().prepare(`
    SELECT id, company, sector, country FROM partners
    WHERE company LIKE ? OR sector LIKE ? OR country LIKE ? OR notes LIKE ?
    ORDER BY strategic_value DESC LIMIT 8
  `).all(like, like, like, like)
  const contacts = db().prepare(`
    SELECT c.id, c.name, c.email, c.partner_id, p.company FROM contacts c
    JOIN partners p ON p.id = c.partner_id
    WHERE c.name LIKE ? OR c.email LIKE ? LIMIT 5
  `).all(like, like)
  const opps = db().prepare(`
    SELECT o.id, o.title, o.partner_id, p.company FROM opportunities o
    LEFT JOIN partners p ON p.id = o.partner_id
    WHERE o.title LIKE ? OR o.description LIKE ? LIMIT 5
  `).all(like, like)
  return NextResponse.json({ partners, contacts, opportunities: opps })
}

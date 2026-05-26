import { requireAuthApi } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { takeSnapshot, listSnapshots } from '@/lib/queries'

export async function GET() {
  const g = requireAuthApi(); if (g) return g;
  return NextResponse.json({ snapshots: listSnapshots() })
}

export async function POST() {
  const g = requireAuthApi(); if (g) return g;
  const s = takeSnapshot()
  return NextResponse.json({ ok: true, snapshot: s })
}

import { requireAuthApi } from '@/lib/auth'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const g = requireAuthApi(); if (g) return g;
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ error: 'database not found' }, { status: 404 })
  }
  const buf = fs.readFileSync(dbPath)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="partnership-backup-${Date.now()}.db"`,
    },
  })
}

import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'

export async function GET() {
  const u = currentUser()
  if (!u) return NextResponse.json({ user: null })
  return NextResponse.json({ user: u })
}

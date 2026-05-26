'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function SnapshotButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const take = () => start(async () => {
    await fetch('/api/snapshots', { method: 'POST' })
    router.refresh()
  })
  return (
    <button onClick={take} disabled={pending} className="btn btn-primary">
      {pending ? 'جاري...' : 'تسجيل لقطة الآن'}
    </button>
  )
}

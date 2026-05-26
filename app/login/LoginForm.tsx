'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError || '')
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push(next || '/')
        router.refresh()
      } else {
        setError('كلمة مرور غير صحيحة')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="password" required
        placeholder="كلمة المرور"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border rounded-lg px-3 py-3 text-center text-lg"
        autoFocus
      />
      {error && <div className="text-rose-600 text-sm text-center">{error}</div>}
      <button disabled={pending || !password} className="btn btn-primary w-full justify-center text-base py-3 disabled:opacity-50">
        {pending ? 'جاري التحقق...' : 'دخول'}
      </button>
    </form>
  )
}

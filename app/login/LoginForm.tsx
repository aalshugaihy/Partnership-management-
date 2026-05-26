'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('admin@local')
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
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const data = await res.json()
        const target = next || (data.user?.role === 'rep' ? '/portal' : '/')
        router.push(target)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'فشل تسجيل الدخول')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs text-slate-500">البريد الإلكتروني</label>
        <input
          type="email" required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-3 mt-1"
          dir="ltr"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">كلمة المرور</label>
        <input
          type="password" required
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-3 mt-1"
          autoFocus
          dir="ltr"
        />
      </div>
      {error && <div className="text-rose-600 text-sm text-center bg-rose-50 p-2 rounded-lg">{error}</div>}
      <button disabled={pending || !password} className="btn btn-primary w-full justify-center text-base py-3 disabled:opacity-50">
        {pending ? 'جاري التحقق...' : 'دخول'}
      </button>
    </form>
  )
}

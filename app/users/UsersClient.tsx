'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: number; email: string; name: string | null; role: string; partner_id: number | null; active: number; last_login: string | null; created_at: string }
type Partner = { id: number; company: string }

const ROLES = ['admin', 'manager', 'viewer', 'rep']

export function UsersClient({ initial, labels, partners }: { initial: User[]; labels: Record<string, string>; partners: Partner[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'viewer', partner_id: '' })
  const [msg, setMsg] = useState('')

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    start(async () => {
      const payload: any = { ...form }
      if (form.role === 'rep' && form.partner_id) payload.partner_id = Number(form.partner_id)
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok) {
        setOpen(false)
        setForm({ email: '', name: '', password: '', role: 'viewer', partner_id: '' })
        router.refresh()
      } else setMsg(data.error)
    })
  }

  const toggle = (u: User) => start(async () => {
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, active: !u.active }) })
    router.refresh()
  })

  const setRole = (u: User, role: string) => start(async () => {
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, role }) })
    router.refresh()
  })

  const remove = (u: User) => {
    if (!confirm(`حذف المستخدم ${u.email}؟`)) return
    start(async () => {
      const res = await fetch('/api/users?id=' + u.id, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else alert((await res.json()).error)
    })
  }

  const resetPwd = (u: User) => {
    const pwd = prompt(`كلمة مرور جديدة لـ ${u.email} (6 أحرف على الأقل):`)
    if (!pwd || pwd.length < 6) return
    start(async () => {
      await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, password: pwd }) })
      alert('تم تحديث كلمة المرور')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary">+ مستخدم جديد</button>
      </div>
      <div className="card overflow-hidden">
        <table className="data">
          <thead><tr><th>البريد</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th><th></th></tr></thead>
          <tbody>
            {initial.map(u => (
              <tr key={u.id}>
                <td className="font-mono text-sm" dir="ltr">{u.email}</td>
                <td>{u.name || '—'}</td>
                <td>
                  <select value={u.role} onChange={e => setRole(u, e.target.value)} className="border rounded px-2 py-1 text-sm">
                    {ROLES.map(r => <option key={r} value={r}>{labels[r] || r}</option>)}
                  </select>
                </td>
                <td>
                  <button onClick={() => toggle(u)} className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>
                    {u.active ? 'مفعّل' : 'موقوف'}
                  </button>
                </td>
                <td className="text-xs text-slate-500">{u.last_login || 'لم يدخل بعد'}</td>
                <td className="flex gap-2">
                  <button onClick={() => resetPwd(u)} className="text-brand-600 text-xs">إعادة كلمة المرور</button>
                  <button onClick={() => remove(u)} className="text-rose-600 text-xs">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form onSubmit={create} onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
            <h2 className="font-bold text-lg">إضافة مستخدم</h2>
            <input required type="email" dir="ltr" placeholder="email@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="الاسم الكامل" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            <input required type="password" dir="ltr" placeholder="كلمة المرور" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              {ROLES.map(r => <option key={r} value={r}>{labels[r] || r}</option>)}
            </select>
            {form.role === 'rep' && (
              <select required value={form.partner_id} onChange={e => setForm({...form, partner_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="">-- اختر الشركة التي يمثلها --</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
              </select>
            )}
            {msg && <div className="text-rose-600 text-sm">{msg}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">إلغاء</button>
              <button disabled={pending} className="btn btn-primary">{pending ? 'جاري...' : 'إضافة'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

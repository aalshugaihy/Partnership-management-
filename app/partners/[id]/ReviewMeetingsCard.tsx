'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Review = {
  id: number
  meeting_date: string
  attendees: string | null
  outcomes: string | null
  next_actions: string | null
  satisfaction_score: number | null
  created_by: string | null
}

export function ReviewMeetingsCard({ partnerId, initial }: { partnerId: number; initial: Review[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    attendees: '',
    outcomes: '',
    next_actions: '',
    satisfaction_score: 4,
  })
  const [msg, setMsg] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    start(async () => {
      const res = await fetch(`/api/partners/${partnerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setOpen(false)
        setForm({ ...form, attendees: '', outcomes: '', next_actions: '' })
        router.refresh()
      } else setMsg(data.error || 'فشل الحفظ')
    })
  }

  const remove = (id: number) => {
    if (!confirm('حذف هذا الاجتماع؟')) return
    start(async () => {
      await fetch(`/api/partners/${partnerId}/reviews?id=${id}`, { method: 'DELETE' })
      router.refresh()
    })
  }

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">اجتماعات المراجعة الدورية ({initial.length})</h3>
        <button onClick={() => setOpen(true)} className="btn btn-primary text-sm">+ تسجيل اجتماع</button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        منهجية GEOSA - مرحلة المتابعة المستمرة والتقويم: اجتماعات دورية بين GEOSA والشريك لمراجعة التنفيذ.
      </p>
      <table className="data">
        <thead>
          <tr><th>التاريخ</th><th>الحضور</th><th>المخرجات</th><th>الإجراءات التالية</th><th>الرضا</th><th></th></tr>
        </thead>
        <tbody>
          {initial.map(r => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{r.meeting_date}</td>
              <td className="text-xs">{r.attendees || '—'}</td>
              <td className="text-xs">{r.outcomes || '—'}</td>
              <td className="text-xs">{r.next_actions || '—'}</td>
              <td className="text-center">
                {r.satisfaction_score ? `${r.satisfaction_score}/5` : '—'}
              </td>
              <td><button onClick={() => remove(r.id)} className="text-rose-600 text-xs">حذف</button></td>
            </tr>
          ))}
          {initial.length === 0 && (
            <tr><td colSpan={6} className="text-center text-slate-500 py-6">لا اجتماعات بعد.</td></tr>
          )}
        </tbody>
      </table>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg">تسجيل اجتماع مراجعة دورية</h2>
            <div>
              <label className="text-xs text-slate-500">تاريخ الاجتماع</label>
              <input type="date" required value={form.meeting_date}
                onChange={e => setForm({ ...form, meeting_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-slate-500">الحضور (أسماء ممثلي الطرفين)</label>
              <input value={form.attendees}
                onChange={e => setForm({ ...form, attendees: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-slate-500">مخرجات الاجتماع / ما تم إنجازه</label>
              <textarea rows={3} value={form.outcomes}
                onChange={e => setForm({ ...form, outcomes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-slate-500">الإجراءات التالية</label>
              <textarea rows={2} value={form.next_actions}
                onChange={e => setForm({ ...form, next_actions: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-slate-500">رضا الطرف الآخر (1-5)</label>
              <input type="number" min={1} max={5} value={form.satisfaction_score}
                onChange={e => setForm({ ...form, satisfaction_score: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            {msg && <div className="text-rose-600 text-sm">{msg}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">إلغاء</button>
              <button disabled={pending} className="btn btn-primary">{pending ? 'جاري...' : 'حفظ'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

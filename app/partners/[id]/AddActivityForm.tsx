'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function AddActivityForm({ partnerId }: { partnerId: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [form, setForm] = useState({ kind: 'ملاحظة', title: '', description: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    start(async () => {
      const res = await fetch(`/api/partners/${partnerId}/activities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ kind: 'ملاحظة', title: '', description: '' })
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2 pt-3 border-t mt-3">
      <div className="grid grid-cols-3 gap-2">
        <select value={form.kind} onChange={e => setForm({...form, kind: e.target.value})}
          className="border rounded-lg px-2 py-2 text-sm">
          {['ملاحظة', 'اجتماع', 'اتصال', 'بريد', 'متابعة'].map(k => <option key={k}>{k}</option>)}
        </select>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
          placeholder="عنوان النشاط *" className="border rounded-lg px-3 py-2 text-sm col-span-2" />
      </div>
      <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
        placeholder="تفاصيل (اختياري)" rows={2}
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button disabled={pending} className="btn btn-primary text-sm w-full">
        {pending ? 'جاري...' : '+ تسجيل نشاط'}
      </button>
    </form>
  )
}

'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function UpdatePartnerForm({ partner }: { partner: any }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    invite_sent: !!partner.invite_sent,
    rfi_sent: !!partner.rfi_sent,
    initial_receipt: !!partner.initial_receipt,
    response_received: !!partner.response_received,
    workshop_attendance: partner.workshop_attendance || '',
    workshop_date: partner.workshop_date || '',
    notes: partner.notes || '',
    status: partner.status || '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMsg('تم الحفظ ✓')
        router.refresh()
        setTimeout(() => setMsg(''), 2000)
      } else {
        setMsg('فشل الحفظ')
      }
    })
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">تحديث حالة التفعيل</h3>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <Toggle label="إرسال الدعوة" checked={form.invite_sent} onChange={v => setForm({...form, invite_sent: v})} />
        <Toggle label="إرسال RFI" checked={form.rfi_sent} onChange={v => setForm({...form, rfi_sent: v})} />
        <Toggle label="استلام أولي" checked={form.initial_receipt} onChange={v => setForm({...form, initial_receipt: v})} />
        <Toggle label="استلام رد" checked={form.response_received} onChange={v => setForm({...form, response_received: v})} />
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">حضور ورش العمل</label>
          <input value={form.workshop_attendance} onChange={e => setForm({...form, workshop_attendance: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="مثل: تم الحضور" />
        </div>
        <div>
          <label className="text-xs text-slate-500">تاريخ الورشة</label>
          <input type="date" value={form.workshop_date?.slice(0, 10) || ''} onChange={e => setForm({...form, workshop_date: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 mt-1" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">الحالة</label>
          <input value={form.status} onChange={e => setForm({...form, status: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="مثل: تم الرد" />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs text-slate-500">ملاحظات</label>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
            className="w-full border rounded-lg px-3 py-2 mt-1" />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={pending} className="btn btn-primary disabled:opacity-60">
          {pending ? 'جاري الحفظ...' : 'حفظ التحديث'}
        </button>
      </div>
    </form>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4" />
      <span>{label}</span>
    </label>
  )
}

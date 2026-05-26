'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function AddPartnerDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    company: '', sector: 'تقنية', country: 'السعودية',
    tier: 'قياسي', strategic_value: 5, notes: ''
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await fetch('/api/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { id } = await res.json()
        setOpen(false)
        router.push(`/partners/${id}`)
      }
    })
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">+ شراكة جديدة</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg">إضافة شراكة جديدة</h2>
            <input required placeholder="اسم الشركة *" value={form.company}
              onChange={e => setForm({...form, company: e.target.value})}
              className="w-full border rounded-lg px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="border rounded-lg px-3 py-2">
                {['تقنية', 'خرائط وملاحة', 'سيارات', 'ذكاء اصطناعي', 'اتصالات', 'استشارات', 'متعدد'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="border rounded-lg px-3 py-2">
                {['السعودية', 'الولايات المتحدة', 'هولندا', 'ألمانيا', 'الصين/اليابان', 'أخرى'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="border rounded-lg px-3 py-2">
                {['استراتيجي', 'مرتفع', 'قياسي'].map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="number" min={1} max={10} value={form.strategic_value}
                onChange={e => setForm({...form, strategic_value: Number(e.target.value)})}
                placeholder="القيمة الاستراتيجية (1-10)"
                className="border rounded-lg px-3 py-2" />
            </div>
            <textarea placeholder="ملاحظات" rows={3} value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full border rounded-lg px-3 py-2" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">إلغاء</button>
              <button disabled={pending} className="btn btn-primary">{pending ? 'جاري...' : 'إضافة'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

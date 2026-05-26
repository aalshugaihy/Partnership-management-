'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Opp = {
  id: number; partner_id: number | null; company: string | null
  title: string; description: string | null; estimated_value: number | null
  probability: number | null; stage: string; status: string; expected_close_date: string | null
}
type Partner = { id: number; company: string }

export function OpportunitiesClient({ initial, partners, stages }: { initial: Opp[]; partners: Partner[]; stages: string[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState<Opp | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<any>({ title: '', description: '', estimated_value: '', probability: 50, stage: 'استكشاف', partner_id: '', expected_close_date: '' })

  const startCreate = () => { setForm({ title: '', description: '', estimated_value: '', probability: 50, stage: 'استكشاف', partner_id: '', expected_close_date: '' }); setCreating(true) }
  const startEdit = (o: Opp) => { setForm({ ...o, partner_id: o.partner_id || '' }); setOpen(o) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        probability: form.probability ? Number(form.probability) : null,
        partner_id: form.partner_id ? Number(form.partner_id) : null,
      }
      const method = open ? 'PATCH' : 'POST'
      const body = open ? { ...payload, id: open.id } : payload
      const res = await fetch('/api/opportunities', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setOpen(null); setCreating(false); router.refresh() }
    })
  }

  const moveStage = (o: Opp, stage: string) => start(async () => {
    await fetch('/api/opportunities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, stage }) })
    router.refresh()
  })

  const close = (o: Opp, won: boolean) => start(async () => {
    await fetch('/api/opportunities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, stage: won ? 'إغلاق فائز' : 'إغلاق خاسر', status: 'مغلقة' }) })
    router.refresh()
  })

  const remove = (o: Opp) => {
    if (!confirm('حذف الفرصة؟')) return
    start(async () => {
      await fetch('/api/opportunities?id=' + o.id, { method: 'DELETE' })
      router.refresh()
    })
  }

  const groups = stages.map(s => ({ stage: s, items: initial.filter(o => o.stage === s) }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startCreate} className="btn btn-primary">+ فرصة جديدة</button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {groups.map(g => {
            const total = g.items.reduce((s, o) => s + (o.estimated_value || 0), 0)
            return (
              <div key={g.stage} className="w-72 shrink-0">
                <div className="card p-3 mb-2 bg-gradient-to-l from-emerald-50 to-white">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm">{g.stage}</h3>
                    <span className="text-xs text-slate-600">{g.items.length} · {(total/1000).toFixed(0)}K</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {g.items.map(o => (
                    <div key={o.id} className="card p-3 hover:border-brand-500 cursor-pointer" onClick={() => startEdit(o)}>
                      <div className="font-semibold text-sm">{o.title}</div>
                      {o.company && <Link href={`/partners/${o.partner_id}`} onClick={e => e.stopPropagation()} className="text-xs text-brand-600">{o.company}</Link>}
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-emerald-700 font-semibold">{o.estimated_value ? `${(o.estimated_value/1000).toFixed(0)}K ر.س` : '—'}</span>
                        <span className="text-slate-500">{o.probability || 0}%</span>
                      </div>
                    </div>
                  ))}
                  {g.items.length === 0 && <div className="text-xs text-slate-400 text-center py-4 border-2 border-dashed rounded">فارغ</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(open || creating) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setOpen(null); setCreating(false) }}>
          <form onSubmit={save} onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-3">
            <h2 className="font-bold text-lg">{open ? 'تعديل الفرصة' : 'فرصة جديدة'}</h2>
            <input required placeholder="عنوان الفرصة *" value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            <textarea placeholder="وصف الفرصة" rows={3} value={form.description || ''}
              onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            <select value={form.partner_id} onChange={e => setForm({...form, partner_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              <option value="">-- اختر شريك (اختياري) --</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="القيمة (ر.س)" value={form.estimated_value || ''}
                onChange={e => setForm({...form, estimated_value: e.target.value})} className="border rounded-lg px-3 py-2" />
              <input type="number" min={0} max={100} placeholder="الاحتمالية %" value={form.probability ?? ''}
                onChange={e => setForm({...form, probability: e.target.value})} className="border rounded-lg px-3 py-2" />
              <input type="date" value={form.expected_close_date || ''}
                onChange={e => setForm({...form, expected_close_date: e.target.value})} className="border rounded-lg px-3 py-2" />
            </div>
            <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              {stages.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex justify-between gap-2 pt-2">
              <div>
                {open && (
                  <>
                    <button type="button" onClick={() => close(open, true)} className="btn btn-ghost text-emerald-600 text-xs">إغلاق فائز</button>
                    <button type="button" onClick={() => close(open, false)} className="btn btn-ghost text-rose-600 text-xs">إغلاق خاسر</button>
                    <button type="button" onClick={() => { remove(open); setOpen(null) }} className="btn btn-ghost text-rose-600 text-xs">حذف</button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setOpen(null); setCreating(false) }} className="btn btn-ghost">إلغاء</button>
                <button disabled={pending} className="btn btn-primary">{pending ? 'جاري...' : 'حفظ'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

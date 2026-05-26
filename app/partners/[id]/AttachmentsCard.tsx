'use client'
import { useEffect, useState, useTransition } from 'react'

type Att = { id: number; filename: string; mime: string; size: number; uploaded_by: string | null; created_at: string }

export function AttachmentsCard({ partnerId }: { partnerId: number }) {
  const [items, setItems] = useState<Att[]>([])
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  const refresh = () => fetch(`/api/partners/${partnerId}/attachments`).then(r => r.json()).then(d => setItems(d.attachments || []))
  useEffect(() => { refresh() }, [partnerId])

  const upload = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { setError('الحد الأقصى 5MB'); return }
    setError('')
    start(async () => {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch(`/api/partners/${partnerId}/attachments`, { method: 'POST', body: fd })
      if (res.ok) refresh()
      else setError((await res.json()).error || 'فشل الرفع')
    })
  }

  const remove = (id: number) => {
    if (!confirm('حذف المرفق؟')) return
    start(async () => {
      await fetch(`/api/partners/${partnerId}/attachments?attId=${id}`, { method: 'DELETE' })
      refresh()
    })
  }

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">المرفقات والوثائق ({items.length})</h3>
        <label className="btn btn-ghost border border-slate-200 text-sm cursor-pointer">
          + رفع ملف
          <input type="file" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      {error && <div className="text-rose-600 text-xs mb-2">{error}</div>}
      <ul className="space-y-2 text-sm">
        {items.map(a => (
          <li key={a.id} className="flex justify-between items-center border-b pb-2 last:border-0">
            <a href={`/api/partners/${partnerId}/attachments/${a.id}`} target="_blank" className="text-brand-700 flex-1 truncate">
              📎 {a.filename}
            </a>
            <span className="text-xs text-slate-500 mx-2">{(a.size / 1024).toFixed(1)}KB</span>
            <button onClick={() => remove(a.id)} className="text-rose-600 text-xs">حذف</button>
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-500 text-center py-4">لا مرفقات.</li>}
      </ul>
      {pending && <div className="text-xs text-slate-500 text-center mt-2">جاري التحميل...</div>}
    </div>
  )
}

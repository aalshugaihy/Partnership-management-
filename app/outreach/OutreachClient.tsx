'use client'
import { useState } from 'react'
import Link from 'next/link'

type Item = { id: number; company: string; sector: string }

export function OutreachClient({ templateId, partners }: { templateId: string; partners: Item[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set(partners.map(p => p.id)))
  const toggle = (id: number) => {
    const next = new Set(sel)
    next.has(id) ? next.delete(id) : next.add(id)
    setSel(next)
  }

  const download = async () => {
    const res = await fetch('/api/outreach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, partnerIds: Array.from(sel) }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outreach-${templateId}-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-slate-500">
        <span>{sel.size} من {partners.length} محدّد</span>
        <div className="flex gap-1">
          <button onClick={() => setSel(new Set(partners.map(p => p.id)))} className="text-brand-600">تحديد الكل</button>
          <span>·</span>
          <button onClick={() => setSel(new Set())} className="text-brand-600">إلغاء</button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {partners.map(p => (
          <label key={p.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-slate-50">
            <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="w-4 h-4" />
            <Link href={`/partners/${p.id}`} className="font-medium flex-1">{p.company}</Link>
            <span className="text-xs text-slate-500">{p.sector}</span>
          </label>
        ))}
        {partners.length === 0 && (
          <div className="text-sm text-slate-500 py-4 text-center">لا يوجد مستهدفون لهذا القالب.</div>
        )}
      </div>
      <button onClick={download} disabled={sel.size === 0} className="btn btn-primary w-full disabled:opacity-50">
        تنزيل CSV للرسائل
      </button>
    </div>
  )
}

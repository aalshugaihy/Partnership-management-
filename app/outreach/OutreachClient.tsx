'use client'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'

type Item = { id: number; company: string; sector: string }
type MailerStatus = { configured: boolean; host: string | null; from: string | null; lastError: string | null }

export function OutreachClient({ templateId, partners }: { templateId: string; partners: Item[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set(partners.map(p => p.id)))
  const [mailer, setMailer] = useState<MailerStatus | null>(null)
  const [sending, startSend] = useTransition()
  const [result, setResult] = useState<string>('')

  useEffect(() => { fetch('/api/outreach/send').then(r => r.json()).then(setMailer).catch(() => {}) }, [])

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

  const sendActual = () => {
    if (!confirm(`إرسال البريد فعليًا إلى ${sel.size} شركة؟`)) return
    setResult('')
    startSend(async () => {
      const res = await fetch('/api/outreach/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, partnerIds: Array.from(sel) }),
      })
      const data = await res.json()
      if (res.ok) setResult(`✓ تم إرسال ${data.sent} رسالة، فشل ${data.failed}${data.skipped?.length ? `، تخطّي ${data.skipped.length} (بلا بريد)` : ''}.`)
      else setResult(`✗ ${data.error}`)
    })
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
      <div className="space-y-2">
        <button onClick={download} disabled={sel.size === 0} className="btn btn-ghost border border-slate-200 w-full disabled:opacity-50">
          تنزيل CSV للرسائل
        </button>
        <button onClick={sendActual} disabled={sel.size === 0 || sending || !mailer?.configured}
          className="btn btn-primary w-full disabled:opacity-50">
          {sending ? 'جاري الإرسال...' : `إرسال البريد فعليًا (${sel.size})`}
        </button>
        {mailer && !mailer.configured && (
          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
            ⚠ SMTP غير مُكوّن. أضف <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> كمتغيرات بيئة لتفعيل الإرسال.
          </div>
        )}
        {result && <div className={`text-xs p-2 rounded ${result.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{result}</div>}
      </div>
    </div>
  )
}

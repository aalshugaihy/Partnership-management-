import { TEMPLATES, audienceFor } from '@/lib/outreach'
import { OutreachClient } from './OutreachClient'

export const dynamic = 'force-dynamic'

export default function OutreachPage({ searchParams }: { searchParams: { t?: string } }) {
  const selected = TEMPLATES.find(t => t.id === searchParams.t) || TEMPLATES[1]
  const audience = audienceFor(selected.id)

  const previewPartner = audience[0]
  const preview = previewPartner ? {
    subject: selected.subject(previewPartner),
    body: selected.body(previewPartner),
  } : null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">التواصل وقوالب الرسائل</h1>
        <p className="text-slate-500 mt-1">قوالب جاهزة لكل مرحلة من رحلة التفعيل، تُخصَّص تلقائياً لكل شركة</p>
      </header>

      <div className="grid md:grid-cols-3 gap-3">
        {TEMPLATES.map(t => {
          const count = audienceFor(t.id).length
          const active = t.id === selected.id
          return (
            <a key={t.id} href={`/outreach?t=${t.id}`}
              className={`card p-4 hover:border-brand-500 transition ${active ? 'border-brand-500 bg-brand-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="font-bold">{t.name}</div>
                <span className="badge badge-blue">{count}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{t.audience}</div>
            </a>
          )
        })}
      </div>

      {preview && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-5 md:col-span-2 space-y-3">
            <h3 className="font-bold">معاينة الرسالة</h3>
            <div className="text-xs text-slate-500">العنوان</div>
            <div className="bg-slate-50 px-3 py-2 rounded-lg font-medium">{preview.subject}</div>
            <div className="text-xs text-slate-500">المحتوى</div>
            <pre className="bg-slate-50 px-3 py-3 rounded-lg whitespace-pre-wrap text-sm font-sans">{preview.body}</pre>
            <div className="text-xs text-slate-500">المعاينة مبنية على بيانات: <strong>{previewPartner!.company}</strong></div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-3">قائمة المستهدفين</h3>
            <OutreachClient
              templateId={selected.id}
              partners={audience.map(p => ({ id: p.id, company: p.company, sector: p.sector || '' }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

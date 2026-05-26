import { generateRecommendations } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function RecommendationsPage() {
  const recs = generateRecommendations()

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">التوصيات الذكية</h1>
          <p className="text-slate-500 mt-1">توصيات مبنية على تحليل بيانات الشراكات والفرص المتوقعة</p>
        </div>
        <div className="text-sm text-slate-500">إجمالي {recs.length} توصية</div>
      </header>

      <div className="space-y-4">
        {recs.map(r => (
          <div key={r.id} className="card p-5 space-y-3">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${r.priority === 'عالية' ? 'badge-red' : r.priority === 'متوسطة' ? 'badge-amber' : 'badge-slate'}`}>
                    أولوية {r.priority}
                  </span>
                  <span className="badge badge-blue">{r.category}</span>
                </div>
                <h3 className="text-lg font-bold mt-2">{r.title}</h3>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <Section label="السبب">{r.rationale}</Section>
              <Section label="الإجراء المقترح">{r.action}</Section>
              <Section label="الأثر المتوقع">{r.expectedImpact}</Section>
            </div>
            {r.affectedPartners.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">الشركات المعنية:</div>
                <div className="flex flex-wrap gap-2">
                  {r.affectedPartners.map(p => (
                    <Link key={p.id} href={`/partners/${p.id}`} className="badge badge-slate hover:bg-brand-100 hover:text-brand-700">
                      {p.company}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {recs.length === 0 && (
          <div className="card p-10 text-center text-slate-500">
            لا توجد توصيات حالياً. الوضع متوازن.
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className="text-slate-800">{children}</div>
    </div>
  )
}

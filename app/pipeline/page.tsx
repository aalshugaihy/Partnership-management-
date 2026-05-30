import { requireAuth } from '@/lib/auth'
import { listPartners } from '@/lib/queries'
import { STAGES, GEOSA_STAGES, GEOSA_CLASSIFICATION_LABELS } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type SP = { view?: 'active' | 'prospect' }

export default function PipelinePage({ searchParams }: { searchParams: SP }) {
  requireAuth()
  const view = searchParams.view || 'active'
  const recordType = view === 'active' ? 'active' : 'prospect'
  const stages = view === 'active' ? GEOSA_STAGES : STAGES
  const all = listPartners({ type: recordType as any })
  const groups = stages.map(stage => ({
    stage,
    items: all.filter(p => p.stage === stage),
  }))

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">مسار التفعيل</h1>
          <p className="text-slate-500 mt-1">
            {view === 'active'
              ? 'دورة حياة الشراكات المبرمة وفق منهجية GEOSA (4 مراحل)'
              : 'قمع المستهدفات: من الدعوة إلى التفعيل (7 مراحل)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pipeline?view=active"
            className={`badge ${view === 'active' ? 'badge-green' : 'badge-slate'} px-3 py-1.5 text-sm`}>
            مبرمة (GEOSA)
          </Link>
          <Link href="/pipeline?view=prospect"
            className={`badge ${view === 'prospect' ? 'badge-amber' : 'badge-slate'} px-3 py-1.5 text-sm`}>
            مستهدفات
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {groups.map(g => (
            <div key={g.stage} className="w-72 shrink-0">
              <div className={`card p-3 mb-3 bg-gradient-to-l ${view === 'active' ? 'from-emerald-50' : 'from-brand-50'} to-white`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{g.stage}</h3>
                  <span className="badge badge-blue">{g.items.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {g.items.slice(0, 30).map(p => (
                  <Link href={`/partners/${p.id}`} key={p.id}
                    className="block card p-3 hover:border-brand-500 transition">
                    <div className="font-semibold text-sm">{p.company}</div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                      <span>{p.sector}</span>
                      {view === 'active' && p.geosa_classification ? (
                        <span className="badge badge-slate text-xs">
                          {GEOSA_CLASSIFICATION_LABELS[p.geosa_classification]}
                        </span>
                      ) : (
                        <span className="badge badge-slate text-xs">{p.tier}</span>
                      )}
                    </div>
                    <div className="h-1 mt-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${p.activation_score > 60 ? 'bg-emerald-500' : p.activation_score > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${p.activation_score}%` }} />
                    </div>
                  </Link>
                ))}
                {g.items.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6 border-2 border-dashed rounded-lg">
                    لا توجد شراكات
                  </div>
                )}
                {g.items.length > 30 && (
                  <div className="text-center text-xs text-slate-500">+{g.items.length - 30} أخرى</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

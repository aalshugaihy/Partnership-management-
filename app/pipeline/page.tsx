import { listPartners } from '@/lib/queries'
import { STAGES } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PipelinePage() {
  const all = listPartners()
  const groups = STAGES.map(stage => ({
    stage,
    items: all.filter(p => p.stage === stage)
  }))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">مسار التفعيل (Pipeline)</h1>
        <p className="text-slate-500 mt-1">عرض الشراكات حسب مرحلتها في رحلة التفعيل</p>
      </header>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {groups.map(g => (
            <div key={g.stage} className="w-72 shrink-0">
              <div className="card p-3 mb-3 bg-gradient-to-l from-brand-50 to-white">
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
                      <span className="badge badge-slate text-xs">{p.tier}</span>
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

import { requireAuth } from '@/lib/auth'
import { generateTasks } from '@/lib/tasks'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function TasksPage() {
  requireAuth()
  const tasks = generateTasks()
  const byPriority = {
    'عالية': tasks.filter(t => t.priority === 'عالية'),
    'متوسطة': tasks.filter(t => t.priority === 'متوسطة'),
    'منخفضة': tasks.filter(t => t.priority === 'منخفضة'),
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">المهام والإشعارات</h1>
        <p className="text-slate-500 mt-1">إجراءات استباقية مولّدة آلياً من حالة المنصة الحالية</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat bg-rose-50"><div className="text-xs text-rose-600">أولوية عالية</div><div className="text-3xl font-black text-rose-700">{byPriority['عالية'].length}</div></div>
        <div className="stat bg-amber-50"><div className="text-xs text-amber-600">أولوية متوسطة</div><div className="text-3xl font-black text-amber-700">{byPriority['متوسطة'].length}</div></div>
        <div className="stat bg-slate-50"><div className="text-xs text-slate-600">أولوية منخفضة</div><div className="text-3xl font-black text-slate-700">{byPriority['منخفضة'].length}</div></div>
      </div>

      {(['عالية', 'متوسطة', 'منخفضة'] as const).map(prio => (
        byPriority[prio].length > 0 && (
          <section key={prio}>
            <h2 className={`text-lg font-bold mb-3 ${prio === 'عالية' ? 'text-rose-700' : prio === 'متوسطة' ? 'text-amber-700' : 'text-slate-700'}`}>
              {prio}
            </h2>
            <div className="space-y-2">
              {byPriority[prio].map(t => (
                <div key={t.id} className="card p-4 flex justify-between items-start gap-3 hover:border-brand-500 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${prio === 'عالية' ? 'badge-red' : prio === 'متوسطة' ? 'badge-amber' : 'badge-slate'}`}>
                        {t.category}
                      </span>
                      <h3 className="font-semibold">{t.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{t.detail}</p>
                  </div>
                  {t.href && (
                    <Link href={t.href} className="btn btn-ghost border border-slate-200 text-sm whitespace-nowrap">
                      {t.category.includes('ورشة') ? 'افتح' : 'اتخذ إجراء ←'}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      ))}

      {tasks.length === 0 && (
        <div className="card p-12 text-center text-slate-500">
          🎉 لا توجد مهام مفتوحة حالياً. الوضع متوازن!
        </div>
      )}
    </div>
  )
}

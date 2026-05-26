'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'لوحة المعلومات', icon: '◐' },
  { href: '/partners', label: 'الشراكات', icon: '◇' },
  { href: '/pipeline', label: 'مسار التفعيل', icon: '⇶' },
  { href: '/workshops', label: 'ورش العمل', icon: '◉' },
  { href: '/kpi', label: 'مؤشرات الأثر', icon: '▤' },
  { href: '/outreach', label: 'التواصل والقوالب', icon: '✉' },
  { href: '/recommendations', label: 'التوصيات الذكية', icon: '✦' },
  { href: '/reports', label: 'التقارير المؤتمتة', icon: '▤' },
  { href: '/import', label: 'استيراد البيانات', icon: '↥' },
  { href: '/licensed', label: 'الجهات المرخصة', icon: '✓' },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-64 bg-white border-l border-slate-200 p-5 flex flex-col gap-1 shrink-0">
      <div className="mb-6 px-2">
        <div className="text-xl font-black text-brand-700">منصة الشراكات</div>
        <div className="text-xs text-slate-500 mt-1">إدارة - متابعة - أثر</div>
      </div>
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`sidebar-link ${path === l.href ? 'active' : ''}`}>
          <span className="text-lg leading-none">{l.icon}</span>
          <span>{l.label}</span>
        </Link>
      ))}
      <div className="mt-auto pt-4 text-xs text-slate-400 px-2">
        الإصدار 1.0 · {new Date().getFullYear()}
      </div>
    </aside>
  )
}

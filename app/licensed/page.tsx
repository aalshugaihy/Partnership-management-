import { getLicensed } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default function LicensedPage() {
  const items = getLicensed()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">الجهات المرخصة</h1>
        <p className="text-slate-500 mt-1">قائمة الشركات والمؤسسات المرخصة - {items.length} جهة</p>
      </header>
      <div className="card overflow-hidden">
        <table className="data">
          <thead><tr><th>#</th><th>الجهة</th><th>رقم التواصل</th><th>البريد الإلكتروني</th></tr></thead>
          <tbody>
            {items.map((l: any) => (
              <tr key={l.id}>
                <td className="text-slate-500">{l.id}</td>
                <td className="font-medium">{l.name}</td>
                <td>{l.phone || '—'}</td>
                <td className="text-slate-700">{l.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

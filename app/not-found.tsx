import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-10 text-center max-w-md">
        <div className="text-6xl font-black text-brand-700">404</div>
        <div className="text-lg font-bold mt-2">الصفحة غير موجودة</div>
        <p className="text-slate-500 mt-2">قد يكون الرابط قديماً أو الصفحة محذوفة.</p>
        <Link href="/" className="btn btn-primary mt-5 inline-flex">العودة للوحة المعلومات</Link>
      </div>
    </div>
  )
}

import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage({ searchParams }: { searchParams: { next?: string; err?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="card p-8 w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="text-3xl font-black text-brand-700">منصة الشراكات</div>
          <div className="text-sm text-slate-500 mt-1">تسجيل الدخول للمتابعة</div>
        </div>
        <LoginForm next={searchParams.next} initialError={searchParams.err} />
        <div className="text-xs text-slate-400 text-center pt-2">
          كلمة المرور الافتراضية للتجربة: <code className="bg-slate-100 px-1 rounded">admin1234</code>
          <br />
          (تُغيَّر عبر متغير البيئة <code>ADMIN_PASSWORD</code> في الإنتاج)
        </div>
      </div>
    </div>
  )
}

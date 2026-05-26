import { ImportClient } from './ImportClient'

export const dynamic = 'force-dynamic'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">استيراد البيانات</h1>
        <p className="text-slate-500 mt-1">تحميل ملف Excel لإضافة شراكات بشكل جماعي</p>
      </header>

      <div className="card p-6">
        <h3 className="font-bold mb-2">تنسيق الملف المتوقع</h3>
        <p className="text-sm text-slate-600 mb-3">
          ملف Excel (.xlsx) يحتوي ورقة واحدة على الأقل، الأعمدة المتوقعة (بأي ترتيب):
        </p>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
          <li><strong>اسم الشركة</strong> (إلزامي)</li>
          <li>القطاع، الدولة، المستوى</li>
          <li>إرسال الدعوة، إرسال RFI، استلام أولي، استلام رد (نعم/لا)</li>
          <li>حضور الورشة، تاريخ الورشة، المنصة</li>
          <li>الحالة، ملاحظات</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          سيتم استنتاج المرحلة ومؤشر التفعيل تلقائياً. الشركات الموجودة (بنفس الاسم) ستُحدّث بدلاً من تكرارها.
        </p>
      </div>

      <ImportClient />
    </div>
  )
}

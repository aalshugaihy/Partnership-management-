'use client'
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-10 text-center max-w-md">
        <div className="text-4xl">⚠</div>
        <div className="text-lg font-bold mt-2">حدث خطأ غير متوقع</div>
        <p className="text-slate-500 mt-2 text-sm">{error.message}</p>
        <button onClick={reset} className="btn btn-primary mt-5">إعادة المحاولة</button>
      </div>
    </div>
  )
}

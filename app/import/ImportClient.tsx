'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ImportClient() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [pending, start] = useTransition()

  const upload = () => {
    if (!file) return
    start(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()
      setResult(data)
      if (data.ok) router.refresh()
    })
  }

  return (
    <div className="card p-6 space-y-4">
      <input type="file" accept=".xlsx,.xls"
        onChange={e => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm" />
      <div className="flex justify-end">
        <button disabled={!file || pending} onClick={upload} className="btn btn-primary disabled:opacity-50">
          {pending ? 'جاري الاستيراد...' : 'استيراد'}
        </button>
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {result.ok
            ? `تم: ${result.created} شراكة جديدة، ${result.updated} محدّثة، ${result.skipped} متجاهلة.`
            : `فشل: ${result.error}`}
        </div>
      )}
    </div>
  )
}

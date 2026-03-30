'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /translate to /records (Records Vault)
export default function TranslateRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/records')
  }, [router])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-slate-600">Redirecting to Records Vault...</p>
      </div>
    </main>
  )
}

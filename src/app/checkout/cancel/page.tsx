'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Suspense } from 'react'

function CancelContent() {
  const searchParams = useSearchParams()
  const product = searchParams.get('product')

  const backLinks = {
    'combat-pdf': '/combat',
    'expert-review': '/expert-review',
    'pro-monthly': '/combat',
  }

  const backHref = backLinks[product as keyof typeof backLinks] || '/'

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Payment Cancelled</h1>
        <p className="text-slate-600 mb-8">
          No worries - you can complete your purchase anytime.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </main>
    }>
      <CancelContent />
    </Suspense>
  )
}

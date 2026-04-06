'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, FileText, Users, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const product = searchParams.get('product')

  const productInfo = {
    'combat-pdf': {
      title: 'PDF Report Purchased',
      description: 'Your Combat analysis PDF is being generated and will be emailed to you shortly.',
      icon: FileText,
      nextStep: 'Check your email for the PDF report.',
      ctaText: 'Back to Combat',
      ctaHref: '/combat',
    },
    'expert-review': {
      title: 'Expert Review Requested',
      description: 'A board-certified oncologist will review your Combat analysis and provide written feedback within 48 hours.',
      icon: Users,
      nextStep: 'You\'ll receive an email when your review is ready.',
      ctaText: 'View Expert Options',
      ctaHref: '/expert-review',
    },
    'pro-monthly': {
      title: 'Welcome to Pro!',
      description: 'You now have unlimited Combat runs, PDF reports, and full perspective tuning.',
      icon: CheckCircle,
      nextStep: 'Start using your Pro features now.',
      ctaText: 'Go to Combat',
      ctaHref: '/combat',
    },
  }

  const info = productInfo[product as keyof typeof productInfo] || {
    title: 'Payment Successful',
    description: 'Thank you for your purchase.',
    icon: CheckCircle,
    nextStep: '',
    ctaText: 'Return Home',
    ctaHref: '/',
  }

  const Icon = info.icon

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">{info.title}</h1>
        <p className="text-slate-600 mb-6">{info.description}</p>

        {info.nextStep && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-slate-700">{info.nextStep}</p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link
            href={info.ctaHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-xl font-semibold transition-colors"
          >
            {info.ctaText}
            <ArrowRight className="w-4 h-4" />
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

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  )
}

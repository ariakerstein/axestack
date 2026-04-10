'use client'

import Link from 'next/link'
import { Phone, Mail, ArrowRight, ExternalLink, Building2 } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface ExpandedAccessCardProps {
  variant?: 'full' | 'compact' | 'minimal'
  context?: string // Where this card is shown (for analytics)
  className?: string
}

export function ExpandedAccessCard({ variant = 'full', context = 'unknown', className = '' }: ExpandedAccessCardProps) {
  const { trackEvent } = useAnalytics()

  const handleClick = (action: string) => {
    trackEvent('expanded_access_card_click', { action, context, variant })
  }

  // Minimal variant - just a link card
  if (variant === 'minimal') {
    return (
      <Link
        href="/expanded-access"
        onClick={() => handleClick('learn_more')}
        className={`block bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-4 transition-colors ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">Expanded Access Program</p>
            <p className="text-sm text-slate-600 truncate">Access investigational drugs through the FDA</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
        </div>
      </Link>
    )
  }

  // Compact variant - quick info with contact
  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Expanded Access Available</h3>
            <p className="text-sm text-slate-600 mb-3">
              When standard treatments aren't working and trials aren't an option,
              the FDA's Project Facilitate can help access investigational drugs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/expanded-access"
                onClick={() => handleClick('learn_more')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="tel:+13017963400"
                onClick={() => handleClick('call_fda')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700"
              >
                <Phone className="w-3.5 h-3.5" /> (301) 796-3400
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full variant - complete info card
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Expanded Access & Project Facilitate</h3>
          <p className="text-sm text-blue-700">FDA Program for Investigational Cancer Drugs</p>
        </div>
      </div>

      <p className="text-slate-600 mb-4">
        If you've exhausted standard treatment options and can't enroll in a clinical trial,
        you may be eligible to access investigational drugs through the FDA's expanded access program.
      </p>

      <div className="bg-white/60 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium text-slate-900 mb-2">Contact FDA Drug Information:</p>
        <div className="flex flex-wrap gap-4">
          <a
            href="tel:+13017963400"
            onClick={() => handleClick('call_fda')}
            className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="font-medium">(301) 796-3400</span>
          </a>
          <a
            href="mailto:druginfo@fda.hhs.gov"
            onClick={() => handleClick('email_fda')}
            className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>druginfo@fda.hhs.gov</span>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/expanded-access"
          onClick={() => handleClick('learn_more')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Learn How It Works
          <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="https://www.fda.gov/about-fda/oncology-center-excellence/project-facilitate"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick('visit_fda')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 transition-colors text-sm"
        >
          FDA Website
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}

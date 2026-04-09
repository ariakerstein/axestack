'use client'

import Link from 'next/link'

interface ToolRecommendationProps {
  recommendation: {
    slug: string
    name: string
    description: string
    icon: string
    href: string
    reason: string
    confidence: string
  }
  onDismiss?: () => void
  className?: string
}

export function ToolRecommendation({ recommendation, onDismiss, className = '' }: ToolRecommendationProps) {
  return (
    <div className={`mt-4 ${className}`}>
      <div className="text-xs text-stone-500 dark:text-stone-400 mb-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Based on your question
      </div>
      <Link
        href={recommendation.href}
        className="block group"
      >
        <div className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 hover:border-[#C66B4A] dark:hover:border-[#C66B4A] hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all">
          <div className="text-2xl flex-shrink-0 mt-0.5">
            {recommendation.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-900 dark:text-stone-100 group-hover:text-[#C66B4A]">
                {recommendation.name}
              </span>
              <svg className="w-4 h-4 text-stone-400 group-hover:text-[#C66B4A] group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">
              {recommendation.reason}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDismiss()
              }}
              className="flex-shrink-0 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              aria-label="Dismiss recommendation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </Link>
    </div>
  )
}

// Compact version for inline use
export function ToolRecommendationCompact({ recommendation, className = '' }: Omit<ToolRecommendationProps, 'onDismiss'>) {
  return (
    <Link
      href={recommendation.href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:border-[#C66B4A] hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group ${className}`}
    >
      <span>{recommendation.icon}</span>
      <span className="text-stone-700 dark:text-stone-300 group-hover:text-[#C66B4A]">
        {recommendation.name}
      </span>
      <svg className="w-3 h-3 text-stone-400 group-hover:text-[#C66B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

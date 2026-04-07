'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, FileText } from 'lucide-react'

interface ProcessingState {
  inProgress: boolean
  total: number
  current: number
  startedAt: number
}

export function RecordsProcessingBanner() {
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null)

  useEffect(() => {
    // Check localStorage for processing state
    const checkProcessing = () => {
      const stored = localStorage.getItem('opencancer-records-processing')
      if (stored) {
        try {
          const state = JSON.parse(stored) as ProcessingState
          // Only show if actually in progress and started within last 10 minutes
          if (state.inProgress && Date.now() - state.startedAt < 10 * 60 * 1000) {
            setProcessingState(state)
          } else {
            setProcessingState(null)
            // Clean up stale state
            localStorage.removeItem('opencancer-records-processing')
          }
        } catch {
          setProcessingState(null)
        }
      } else {
        setProcessingState(null)
      }
    }

    // Check immediately and then every 2 seconds
    checkProcessing()
    const interval = setInterval(checkProcessing, 2000)

    return () => clearInterval(interval)
  }, [])

  if (!processingState) return null

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Loader2 className="w-4 h-4 animate-spin" />
          <FileText className="w-4 h-4" />
          <span>
            Processing records ({processingState.current}/{processingState.total})...
          </span>
        </div>
        <Link
          href="/records"
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          View progress →
        </Link>
      </div>
    </div>
  )
}

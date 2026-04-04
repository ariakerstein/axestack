'use client'

import { useState, useEffect } from 'react'
import { BookOpen, RefreshCw, Clock, Activity, Pill, Dna, HelpCircle, ChevronRight, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const SUMMARY_TYPES = [
  { id: 'overview', label: 'Overview', icon: BookOpen, description: 'Your cancer at a glance' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Your treatment journey' },
  { id: 'treatment_history', label: 'Treatments', icon: Pill, description: 'All treatments tried' },
  { id: 'biomarkers', label: 'Biomarkers', icon: Dna, description: 'Your biomarker profile' },
  { id: 'open_questions', label: 'Questions', icon: HelpCircle, description: 'For your care team' },
] as const

type SummaryType = typeof SUMMARY_TYPES[number]['id']

interface Summary {
  id: string
  summary_type: SummaryType
  title: string
  content: string
  created_at: string
  is_stale: boolean
}

interface PatientWikiProps {
  sessionId: string | null
  userId: string | null
  entityCount?: number
  className?: string
}

export function PatientWiki({ sessionId, userId, entityCount = 0, className = '' }: PatientWikiProps) {
  const [summaries, setSummaries] = useState<Record<string, Summary>>({})
  const [activeType, setActiveType] = useState<SummaryType>('overview')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing summaries
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!sessionId && !userId) return

      try {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        else if (sessionId) params.set('sessionId', sessionId)

        const response = await fetch(`/api/summaries/generate?${params}`)
        if (response.ok) {
          const data = await response.json()
          setSummaries(data.byType || {})
        }
      } catch (err) {
        console.error('Error fetching summaries:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [sessionId, userId])

  const generateSummary = async (type: SummaryType, force = false) => {
    if (!sessionId && !userId) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryType: type,
          sessionId,
          userId,
          forceRegenerate: force
        })
      })

      const data = await response.json()

      if (data.success && data.summary) {
        setSummaries(prev => ({
          ...prev,
          [type]: data.summary
        }))
      } else if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to generate summary')
      console.error('Error generating summary:', err)
    } finally {
      setGenerating(false)
    }
  }

  const activeSummary = summaries[activeType]
  const activeConfig = SUMMARY_TYPES.find(t => t.id === activeType)!

  if (entityCount === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-8 text-center ${className}`}>
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 mb-2">Your Patient Wiki</h3>
        <p className="text-slate-500 text-sm mb-4">
          Upload medical documents to build your personal knowledge base.
          We'll extract key information and create summaries automatically.
        </p>
        <p className="text-xs text-slate-400">
          Your wiki grows smarter with every document you add.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Your Patient Wiki</h3>
              <p className="text-xs text-slate-500">
                {entityCount} entities extracted • AI-generated summaries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Living Document
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {SUMMARY_TYPES.map(type => {
          const Icon = type.icon
          const isActive = activeType === type.id
          const hasSummary = !!summaries[type.id]

          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`flex-shrink-0 px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-slate-500 text-slate-700 bg-slate-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
              {!hasSummary && (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Not generated yet" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : activeSummary ? (
          <div>
            {/* Summary Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-900">{activeSummary.title}</h4>
                <p className="text-xs text-slate-500">
                  Generated {new Date(activeSummary.created_at).toLocaleDateString()}
                  {activeSummary.is_stale && ' • May be outdated'}
                </p>
              </div>
              <button
                onClick={() => generateSummary(activeType, true)}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>

            {/* Markdown Content */}
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{activeSummary.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <activeConfig.icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-semibold text-slate-900 mb-2">{activeConfig.description}</h4>
            <p className="text-slate-500 text-sm mb-6">
              This summary hasn't been generated yet.
            </p>
            <button
              onClick={() => generateSummary(activeType)}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {activeConfig.label}
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer - Quick Stats */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {Object.keys(summaries).length} of {SUMMARY_TYPES.length} summaries generated
          </span>
          <button
            onClick={() => {
              // Generate all summaries
              SUMMARY_TYPES.forEach(type => {
                if (!summaries[type.id]) {
                  generateSummary(type.id)
                }
              })
            }}
            className="text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
          >
            Generate All
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

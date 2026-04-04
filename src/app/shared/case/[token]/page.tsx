'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FileText, Clock, Eye, AlertTriangle, CheckCircle, HelpCircle, Calendar, Lightbulb, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

interface CaseBrief {
  bottomLine: string
  keyFindings: string[]
  gaps: string[]
  questionsForDoctor: string[]
  timeline: Array<{ date: string; event: string; source?: string }>
  cancerSummary?: {
    type: string
    stage: string
    biomarkers: string[]
    treatments: string[]
  }
}

interface SharedCaseData {
  caseBrief: CaseBrief
  recordSummaries: Array<{ fileName: string; documentType: string; summary: string }>
  cancerType: string | null
  createdAt: string
  expiresAt: string
  viewCount: number
}

export default function SharedCasePage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<SharedCaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSharedCase() {
      try {
        const response = await fetch(`/api/case-review/share?token=${token}`)
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to load shared case')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSharedCase()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading shared case...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {error === 'This share link has expired' ? 'Link Expired' : 'Case Not Found'}
          </h1>
          <p className="text-slate-600 mb-6">{error || 'This shared case could not be found.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
          >
            Go to opencancer.ai
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { caseBrief, recordSummaries, createdAt, expiresAt, viewCount } = data
  const expiresIn = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Shared badge */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Shared Case Review</p>
            <p className="text-sm text-slate-600">
              Someone shared their AI case review with you. Shared on {new Date(createdAt).toLocaleDateString()}.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Important Disclaimer</p>
              <p>This AI-generated case review is for educational purposes only. It is not medical advice. Always consult with qualified healthcare providers for medical decisions.</p>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">The Bottom Line</h2>
          </div>
          <p className="text-slate-700 leading-relaxed">{caseBrief.bottomLine}</p>
        </div>

        {/* Cancer Summary */}
        {caseBrief.cancerSummary?.type && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Cancer Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-600 font-medium uppercase">Type</p>
                <p className="text-slate-900 font-semibold">{caseBrief.cancerSummary.type}</p>
              </div>
              {caseBrief.cancerSummary.stage && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium uppercase">Stage</p>
                  <p className="text-slate-900 font-semibold">{caseBrief.cancerSummary.stage}</p>
                </div>
              )}
              {caseBrief.cancerSummary.biomarkers?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 col-span-2">
                  <p className="text-xs text-green-600 font-medium uppercase">Biomarkers</p>
                  <p className="text-slate-900 font-semibold">{caseBrief.cancerSummary.biomarkers.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Findings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Key Findings</h2>
          </div>
          <ul className="space-y-3">
            {caseBrief.keyFindings?.map((finding, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <span className="text-slate-700">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Timeline */}
        {caseBrief.timeline?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-slate-900">Timeline</h2>
            </div>
            <div className="space-y-4">
              {caseBrief.timeline.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-24 text-sm font-medium text-slate-600">{event.date}</div>
                  <div className="flex-1">
                    <p className="text-slate-900">{event.event}</p>
                    {event.source && <p className="text-xs text-slate-500 mt-1">Source: {event.source}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions for Doctor */}
        {caseBrief.questionsForDoctor?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-fuchsia-500" />
              <h2 className="text-lg font-bold text-slate-900">Questions to Ask the Doctor</h2>
            </div>
            <ul className="space-y-2">
              {caseBrief.questionsForDoctor.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-fuchsia-500">•</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="bg-slate-900 rounded-2xl p-6 text-center text-white">
          <h3 className="text-xl font-bold mb-2">Want to analyze your own medical records?</h3>
          <p className="text-slate-300 mb-4">
            Upload your records to get a personalized AI case review - free.
          </p>
          <Link
            href="/records"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}

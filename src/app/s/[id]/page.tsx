'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, ChevronDown, ChevronUp, AlertCircle, Clock, Eye } from 'lucide-react'

interface TranslationResult {
  document_type: string
  patient_name: string
  date_of_service: string
  provider_name: string
  institution: string
  diagnosis: string[]
  test_summary: string
  questions_to_ask_doctor: string
  recommended_next_steps: string[]
  cancer_specific: {
    cancer_type: string
    stage: string
    grade: string
    biomarkers: string[]
    treatment_timeline: string
  }
  lab_values: {
    key_results: { test: string; value: string; reference_range: string; status: string }[]
  }
  technical_terms_explained: { term: string; definition: string }[]
  processing_metadata: { confidence_level: string; completeness: string }
}

interface SharedRecord {
  fileName: string
  documentType: string
  summary: string
  result: TranslationResult
  createdAt: string
  viewCount: number
}

export default function SharedRecordPage() {
  const params = useParams()
  const shareId = params.id as string

  const [record, setRecord] = useState<SharedRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'questions']))

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await fetch(`/api/share?id=${shareId}`)
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Failed to load shared record')
          return
        }
        const data = await response.json()
        setRecord(data)
      } catch (err) {
        setError('Failed to load shared record')
      } finally {
        setLoading(false)
      }
    }

    if (shareId) {
      fetchRecord()
    }
  }, [shareId])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading shared record...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{error}</h1>
          <p className="text-slate-600 mb-6">This link may have expired or been removed.</p>
          <Link
            href="/records"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
          >
            Upload Your Own Records
          </Link>
        </div>
      </div>
    )
  }

  if (!record) return null

  const result = record.result

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-violet-600 font-bold">open</span>
            <span className="font-bold text-slate-900">cancer</span>
            <span className="text-violet-600 font-bold">.ai</span>
          </Link>
          <Link
            href="/records"
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Upload Your Records
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Shared indicator */}
        <div className="mb-6 flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Shared {new Date(record.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{record.viewCount} views</span>
          </div>
        </div>

        {/* Record card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-900 truncate">{record.fileName}</h1>
                <p className="text-violet-600 font-medium">{record.documentType}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {result.processing_metadata?.confidence_level || 'Moderate'} confidence
                </p>
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div className="divide-y divide-slate-100">
            {/* Summary */}
            <div>
              <button
                onClick={() => toggleSection('summary')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <span className="font-semibold text-slate-900">Plain English Summary</span>
                </div>
                {expandedSections.has('summary') ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {expandedSections.has('summary') && (
                <div className="px-4 pb-4">
                  <p className="text-slate-700 leading-relaxed pl-9">{result.test_summary}</p>
                </div>
              )}
            </div>

            {/* Diagnosis */}
            {result.diagnosis && result.diagnosis.length > 0 && result.diagnosis[0] !== 'unknown' && (
              <div>
                <button
                  onClick={() => toggleSection('diagnosis')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔍</span>
                    <span className="font-semibold text-slate-900">Key Findings</span>
                  </div>
                  {expandedSections.has('diagnosis') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('diagnosis') && (
                  <div className="px-4 pb-4 pl-12">
                    <ul className="space-y-2">
                      {result.diagnosis.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <span className="text-violet-500 mt-1">•</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Cancer Info */}
            {result.cancer_specific && result.cancer_specific.cancer_type !== 'unknown' && (
              <div>
                <button
                  onClick={() => toggleSection('cancer')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎗️</span>
                    <span className="font-semibold text-slate-900">Cancer Information</span>
                  </div>
                  {expandedSections.has('cancer') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('cancer') && (
                  <div className="px-4 pb-4 pl-12 space-y-2">
                    <p className="text-slate-700"><strong>Type:</strong> {result.cancer_specific.cancer_type}</p>
                    {result.cancer_specific.stage !== 'unknown' && (
                      <p className="text-slate-700"><strong>Stage:</strong> {result.cancer_specific.stage}</p>
                    )}
                    {result.cancer_specific.grade !== 'unknown' && (
                      <p className="text-slate-700"><strong>Grade:</strong> {result.cancer_specific.grade}</p>
                    )}
                    {result.cancer_specific.biomarkers?.length > 0 && (
                      <p className="text-slate-700"><strong>Biomarkers:</strong> {result.cancer_specific.biomarkers.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lab Results */}
            {result.lab_values?.key_results && result.lab_values.key_results.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('labs')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧪</span>
                    <span className="font-semibold text-slate-900">Lab Results</span>
                  </div>
                  {expandedSections.has('labs') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('labs') && (
                  <div className="px-4 pb-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-semibold text-slate-600">Test</th>
                          <th className="text-left py-2 font-semibold text-slate-600">Value</th>
                          <th className="text-left py-2 font-semibold text-slate-600">Reference</th>
                          <th className="text-left py-2 font-semibold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.lab_values.key_results.map((lab, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2 text-slate-700">{lab.test}</td>
                            <td className="py-2 font-medium text-slate-900">{lab.value}</td>
                            <td className="py-2 text-slate-500">{lab.reference_range || 'N/A'}</td>
                            <td className={`py-2 font-medium ${
                              lab.status === 'Normal' ? 'text-green-600' :
                              lab.status === 'Critical' ? 'text-red-600' :
                              'text-amber-600'
                            }`}>{lab.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Questions */}
            {result.questions_to_ask_doctor && (
              <div>
                <button
                  onClick={() => toggleSection('questions')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">❓</span>
                    <span className="font-semibold text-slate-900">Questions for Your Doctor</span>
                  </div>
                  {expandedSections.has('questions') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('questions') && (
                  <div className="px-4 pb-4 pl-12">
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{result.questions_to_ask_doctor}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medical Terms */}
            {result.technical_terms_explained && result.technical_terms_explained.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('terms')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📖</span>
                    <span className="font-semibold text-slate-900">Medical Terms Explained</span>
                  </div>
                  {expandedSections.has('terms') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.has('terms') && (
                  <div className="px-4 pb-4 pl-12 space-y-3">
                    {result.technical_terms_explained.map((term, i) => (
                      <div key={i}>
                        <p className="font-semibold text-slate-900">{term.term}</p>
                        <p className="text-slate-600 text-sm">{term.definition}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Disclaimer:</strong> This is an educational summary only and does not constitute medical advice.
            Always discuss your medical records with a qualified healthcare provider.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Want to translate your own medical records?</p>
          <Link
            href="/records"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Upload Your Records Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 py-6">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Powered by <Link href="/" className="text-violet-600 hover:text-violet-700">opencancer.ai</Link></p>
        </div>
      </footer>
    </main>
  )
}

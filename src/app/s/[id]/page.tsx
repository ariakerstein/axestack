'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, ChevronDown, ChevronUp, AlertCircle, Clock, Eye, MessageCircle, Swords, Shield, FlaskConical, Target, Leaf, ArrowRight, Share2, Copy, Check, Send } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'

// Icon mapping for Combat perspectives
const PERSPECTIVE_ICONS: Record<string, React.ReactNode> = {
  shield: <Shield className="w-5 h-5" />,
  flask: <FlaskConical className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  clock: <Clock className="w-5 h-5" />,
  leaf: <Leaf className="w-5 h-5" />,
  swords: <Swords className="w-5 h-5" />,
}

interface TranslationResult {
  type?: 'record' | 'qa' | 'combat'
  document_type?: string
  patient_name?: string
  date_of_service?: string
  provider_name?: string
  institution?: string
  diagnosis?: string[]
  test_summary?: string
  questions_to_ask_doctor?: string
  recommended_next_steps?: string[]
  cancer_specific?: {
    cancer_type: string
    stage: string
    grade: string
    biomarkers: string[]
    treatment_timeline: string
  }
  lab_values?: {
    key_results: { test: string; value: string; reference_range: string; status: string }[]
  }
  technical_terms_explained?: { term: string; definition: string }[]
  processing_metadata?: { confidence_level: string; completeness: string }
  // Q&A specific
  question?: string
  answer?: string
  cancerType?: string
  followUpQuestions?: string[]
  // Combat specific
  perspectives?: {
    name: string
    icon: string
    color: string
    argument: string
    evidence: string[]
    confidence: number
    recommendation: string
  }[]
  synthesis?: string
  consensus?: string[]
  divergence?: string[]
  phase?: string
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'questions', 'answer']))
  const [copied, setCopied] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUpMessages, setFollowUpMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false)

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await fetch(`/api/share?id=${shareId}`)
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Failed to load shared content')
          return
        }
        const data = await response.json()
        setRecord(data)
      } catch (err) {
        setError('Failed to load shared content')
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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading shared content...</div>
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
            href="/ask"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            Ask Your Own Question
          </Link>
        </div>
      </div>
    )
  }

  if (!record) return null

  const result = record.result
  const contentType = result.type || (record.documentType === 'qa' ? 'qa' : record.documentType === 'combat' ? 'combat' : 'record')

  // Q&A Content View
  if (contentType === 'qa') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navbar />

        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Shared indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Shared {new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{record.viewCount} views</span>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          {/* Q&A Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Question asked on Ask Navis</p>
                  <h1 className="text-lg font-semibold text-slate-900">{result.question}</h1>
                  {result.cancerType && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {result.cancerType}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Answer */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">N</span>
                </div>
                <span className="font-medium text-slate-900">Navis</span>
              </div>
              <div className="prose prose-slate prose-sm max-w-none">
                <TypewriterMarkdown text={result.answer || ''} instantRender={true} />
              </div>
            </div>

            {/* Follow-up questions if any */}
            {result.followUpQuestions && result.followUpQuestions.length > 0 && (
              <div className="px-6 pb-6">
                <p className="text-sm text-slate-500 mb-2">Related questions:</p>
                <div className="space-y-2">
                  {result.followUpQuestions.slice(0, 3).map((q, i) => (
                    <Link
                      key={i}
                      href={`/ask?q=${encodeURIComponent(q)}&ref=share_${shareId}`}
                      className="block text-sm text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      → {q}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Continue asking - inline input with context preservation */}
            <div className="px-6 pb-6 border-t border-slate-100 pt-4">
              {/* Show previous follow-up messages */}
              {followUpMessages.length > 0 && (
                <div className="space-y-3 mb-4">
                  {followUpMessages.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-slate-900 text-white ml-8' : 'bg-slate-50 mr-8'}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">N</span>
                          </div>
                          <span className="font-medium text-slate-900 text-xs">Navis</span>
                        </div>
                      )}
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                        {msg.role === 'assistant' ? (
                          <TypewriterMarkdown text={msg.content} speed={15} instantRender={i < followUpMessages.length - 1} />
                        ) : (
                          <p className="text-sm m-0">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-slate-500 mb-3">
                {followUpMessages.length > 0 ? 'Continue the conversation:' : 'Have a follow-up question?'}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!followUpQuestion.trim() || isAskingFollowUp) return

                  const userQuestion = followUpQuestion.trim()
                  setFollowUpQuestion('')
                  setIsAskingFollowUp(true)

                  // Add user message immediately
                  setFollowUpMessages(prev => [...prev, { role: 'user', content: userQuestion }])

                  try {
                    // Build full history including original Q&A and all follow-ups
                    const fullHistory = [
                      { role: 'user', content: result.question || '' },
                      { role: 'assistant', content: result.answer || '' },
                      ...followUpMessages,
                    ]

                    const response = await fetch('/api/ask', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: userQuestion,
                        cancerType: result.cancerType || '',
                        history: fullHistory,
                      }),
                    })

                    const data = await response.json()
                    const answer = data.answer || data.response || 'Sorry, I could not process that.'
                    setFollowUpMessages(prev => [...prev, { role: 'assistant', content: answer }])
                  } catch {
                    setFollowUpMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
                  } finally {
                    setIsAskingFollowUp(false)
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  disabled={isAskingFollowUp}
                />
                <button
                  type="submit"
                  disabled={!followUpQuestion.trim() || isAskingFollowUp}
                  className="px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isAskingFollowUp ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Ask
                </button>
              </form>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> This information is for educational purposes only. Always consult your healthcare team for personalized medical advice.
            </p>
          </div>

          {/* Viral CTA */}
          <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Have your own cancer questions?</h2>
            <p className="text-slate-300 mb-6 max-w-md mx-auto">
              Ask Navis - our AI assistant trained on NCCN guidelines - any question about your cancer journey.
            </p>
            <Link
              href={`/ask?ref=share_${shareId}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all shadow-lg"
            >
              Ask Navis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-slate-400 text-sm mt-4">Free to use - no signup required</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 mt-12 py-6">
          <div className="max-w-3xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>Powered by <Link href="/" className="text-slate-900 hover:underline">opencancer.ai</Link></p>
          </div>
        </footer>
      </main>
    )
  }

  // Combat Content View
  if (contentType === 'combat') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navbar />

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Shared indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Shared {new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{record.viewCount} views</span>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          {/* Combat Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-purple-600 uppercase tracking-wide mb-1 font-medium">CancerCombat Analysis</p>
                  <h1 className="text-lg font-semibold text-slate-900">{result.question}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                      {result.phase || 'diagnosis'} phase
                    </span>
                    {result.cancerType && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {result.cancerType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Perspectives Grid */}
            {result.perspectives && result.perspectives.length > 0 && (
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm">
                    {result.perspectives.length}
                  </span>
                  AI Perspectives
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.perspectives.map((p, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                      style={{ borderLeftColor: p.color, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                          {PERSPECTIVE_ICONS[p.icon] || <Shield className="w-4 h-4" />}
                        </div>
                        <span className="font-medium text-slate-900">{p.name}</span>
                        <span className="ml-auto text-xs text-slate-400">{p.confidence}% confident</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-3">{p.argument}</p>
                      {p.recommendation && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <strong>Recommends:</strong> {p.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthesis */}
            {result.synthesis && (
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3">Synthesis</h3>
                <p className="text-slate-700 leading-relaxed">{result.synthesis}</p>
              </div>
            )}

            {/* Consensus & Divergence */}
            <div className="p-6 grid md:grid-cols-2 gap-6">
              {result.consensus && result.consensus.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    Points of Agreement
                  </h4>
                  <ul className="space-y-1">
                    {result.consensus.map((c, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.divergence && result.divergence.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    </div>
                    Points to Discuss
                  </h4>
                  <ul className="space-y-1">
                    {result.divergence.map((d, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> This AI analysis is for educational purposes only and does not constitute medical advice. Always discuss treatment decisions with your healthcare team.
            </p>
          </div>

          {/* Viral CTA */}
          <div className="mt-8 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Get multiple AI perspectives on your case</h2>
            <p className="text-purple-200 mb-6 max-w-md mx-auto">
              CancerCombat analyzes your diagnosis from 10 different expert perspectives to help you understand all your options.
            </p>
            <Link
              href={`/combat?ref=share_${shareId}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-900 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-lg"
            >
              Run CancerCombat
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-purple-300 text-sm mt-4">Free analysis - bring your own records</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 mt-12 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>Powered by <Link href="/" className="text-slate-900 hover:underline">opencancer.ai</Link></p>
          </div>
        </footer>
      </main>
    )
  }

  // Original Record View (default)
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar />

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
              <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-900 truncate">{record.fileName}</h1>
                <p className="text-slate-600 font-medium">{record.documentType}</p>
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
                          <span className="text-slate-400 mt-1">•</span>
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
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{result.questions_to_ask_doctor}</p>
                    </div>
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
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Upload Your Records Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 py-6">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Powered by <Link href="/" className="text-orange-600 hover:text-orange-700">opencancer.ai</Link></p>
        </div>
      </footer>
    </main>
  )
}

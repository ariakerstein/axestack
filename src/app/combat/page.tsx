'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FileText, Shield, FlaskConical, Leaf, ChevronDown, ChevronUp, Swords, ArrowRight, Sparkles, Target, CheckCircle2, Download, Share2, Trophy, Star, Play, Zap } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAnalytics } from '@/hooks/useAnalytics'

// Animated AI Trio Component - Three AI perspectives visualized
function AITrioAnimation({ isActive }: { isActive: boolean }) {
  return (
    <div className="relative h-32 flex items-center justify-center gap-6">
      {/* NCCN Guidelines - Shield */}
      <div className={`flex flex-col items-center transition-all duration-500 ${isActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '0ms' }}>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ${isActive ? 'ring-4 ring-blue-400/50 ring-offset-2' : ''}`}>
          <Shield className="w-8 h-8 text-white" />
        </div>
        <span className="mt-2 text-xs font-semibold text-blue-600">Guidelines</span>
      </div>

      {/* Emerging Research - Flask */}
      <div className={`flex flex-col items-center transition-all duration-500 ${isActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '150ms' }}>
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 transform ${isActive ? 'scale-110 ring-4 ring-purple-400/50 ring-offset-2' : ''}`}>
          <FlaskConical className="w-10 h-10 text-white" />
        </div>
        <span className="mt-2 text-xs font-semibold text-purple-600">Research</span>
      </div>

      {/* Integrative - Leaf */}
      <div className={`flex flex-col items-center transition-all duration-500 ${isActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '300ms' }}>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ${isActive ? 'ring-4 ring-emerald-400/50 ring-offset-2' : ''}`}>
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <span className="mt-2 text-xs font-semibold text-emerald-600">Integrative</span>
      </div>

      {/* Connecting lines/sparks when active */}
      {isActive && (
        <>
          <div className="absolute top-1/2 left-1/4 w-1/2 h-px bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 animate-pulse" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-amber-400 animate-ping" />
        </>
      )}
    </div>
  )
}

interface TranslationResult {
  document_type: string
  patient_name: string
  diagnosis: string[]
  cancer_specific: {
    cancer_type: string
    stage: string
    grade: string
    biomarkers: string[]
    treatment_timeline: string
  }
  test_summary: string
  recommended_next_steps: string[]
}

interface SavedTranslation {
  id: string
  fileName: string
  date: string
  documentType: string
  result: TranslationResult
  documentText?: string
}

interface Perspective {
  name: string
  icon: 'shield' | 'flask' | 'leaf'
  color: string
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
}

interface CombatResult {
  phase: 'diagnosis' | 'treatment'
  question: string
  perspectives: Perspective[]
  synthesis: string
  consensus: string[]
  divergence: string[]
}

// Double Diamond Visual Component - Clean, no heavy container
function DoubleDiamond({ activeDiamond, completedPhases }: { activeDiamond: 'diagnosis' | 'treatment' | null, completedPhases: { diagnosis: boolean, treatment: boolean } }) {
  return (
    <div className="py-4">
      {/* Compact explanation */}
      <p className="text-center text-xs text-slate-500 mb-4 max-w-sm mx-auto">
        <span className="font-medium text-slate-600">Diverge → Converge:</span> Explore all options, then focus on what matters.
      </p>

      <div className="flex items-center justify-center gap-4">
        {/* Diamond 1: Diagnosis */}
        <div className="flex flex-col items-center">
          <span className={`text-sm font-semibold mb-3 ${completedPhases.diagnosis ? 'text-violet-600' : 'text-slate-700'}`}>
            Diagnosis
            {completedPhases.diagnosis && <CheckCircle2 className="w-4 h-4 inline ml-1 text-emerald-500" />}
          </span>
          <div className="relative">
            <svg width="180" height="90" viewBox="0 0 180 90">
              <defs>
                <linearGradient id="diagDiverge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={activeDiamond === 'diagnosis' || completedPhases.diagnosis ? '#8B5CF6' : '#E2E8F0'} />
                  <stop offset="100%" stopColor={activeDiamond === 'diagnosis' || completedPhases.diagnosis ? '#A78BFA' : '#CBD5E1'} />
                </linearGradient>
                <linearGradient id="diagConverge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={activeDiamond === 'diagnosis' || completedPhases.diagnosis ? '#7C3AED' : '#CBD5E1'} />
                  <stop offset="100%" stopColor={activeDiamond === 'diagnosis' || completedPhases.diagnosis ? '#6D28D9' : '#94A3B8'} />
                </linearGradient>
              </defs>
              {/* Left triangle (diverge) */}
              <polygon points="0,45 90,0 90,90" fill="url(#diagDiverge)" className="transition-all duration-300" />
              {/* Right triangle (converge) */}
              <polygon points="90,0 180,45 90,90" fill="url(#diagConverge)" className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className={`w-7 h-7 ${activeDiamond === 'diagnosis' || completedPhases.diagnosis ? 'text-white' : 'text-slate-400'} drop-shadow-md`} />
            </div>
          </div>
          <div className="flex mt-2 gap-8">
            <div className="text-center">
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'diagnosis' || completedPhases.diagnosis ? 'text-violet-500' : 'text-slate-400'}`}>Diverge</span>
              <p className="text-[9px] text-slate-400">Explore all</p>
            </div>
            <div className="text-center">
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'diagnosis' || completedPhases.diagnosis ? 'text-violet-700' : 'text-slate-400'}`}>Converge</span>
              <p className="text-[9px] text-slate-400">Decide best</p>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center mx-2">
          <ArrowRight className={`w-8 h-8 ${completedPhases.diagnosis ? 'text-orange-400' : 'text-slate-300'}`} />
        </div>

        {/* Diamond 2: Treatment */}
        <div className="flex flex-col items-center">
          <span className={`text-sm font-semibold mb-3 ${completedPhases.treatment ? 'text-orange-600' : 'text-slate-700'}`}>
            Treatment
            {completedPhases.treatment && <CheckCircle2 className="w-4 h-4 inline ml-1 text-emerald-500" />}
          </span>
          <div className="relative">
            <svg width="180" height="90" viewBox="0 0 180 90">
              <defs>
                <linearGradient id="treatDiverge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={activeDiamond === 'treatment' || completedPhases.treatment ? '#F97316' : '#E2E8F0'} />
                  <stop offset="100%" stopColor={activeDiamond === 'treatment' || completedPhases.treatment ? '#FB923C' : '#CBD5E1'} />
                </linearGradient>
                <linearGradient id="treatConverge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={activeDiamond === 'treatment' || completedPhases.treatment ? '#EA580C' : '#CBD5E1'} />
                  <stop offset="100%" stopColor={activeDiamond === 'treatment' || completedPhases.treatment ? '#DC2626' : '#94A3B8'} />
                </linearGradient>
              </defs>
              {/* Left triangle (diverge) */}
              <polygon points="0,45 90,0 90,90" fill="url(#treatDiverge)" className="transition-all duration-300" />
              {/* Right triangle (converge) */}
              <polygon points="90,0 180,45 90,90" fill="url(#treatConverge)" className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className={`w-7 h-7 ${activeDiamond === 'treatment' || completedPhases.treatment ? 'text-white' : 'text-slate-400'} drop-shadow-md`} />
            </div>
          </div>
          <div className="flex mt-2 gap-8">
            <div className="text-center">
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'treatment' || completedPhases.treatment ? 'text-orange-500' : 'text-slate-400'}`}>Diverge</span>
              <p className="text-[9px] text-slate-400">All options</p>
            </div>
            <div className="text-center">
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'treatment' || completedPhases.treatment ? 'text-red-600' : 'text-slate-400'}`}>Converge</span>
              <p className="text-[9px] text-slate-400">Your plan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lightweight section divider
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// Perspective Card Component
function PerspectiveCard({ perspective, isExpanded, onToggle }: {
  perspective: Perspective
  isExpanded: boolean
  onToggle: () => void
}) {
  const iconMap = {
    shield: Shield,
    flask: FlaskConical,
    leaf: Leaf
  }
  const Icon = iconMap[perspective.icon]

  const colorMap: Record<string, { bg: string, border: string, text: string, icon: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-600' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600' }
  }
  const colors = colorMap[perspective.color] || colorMap.blue

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${colors.text}`}>{perspective.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{perspective.confidence}% confident</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{perspective.recommendation}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Argument</p>
            <p className="text-sm text-slate-700">{perspective.argument}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Evidence</p>
            <ul className="space-y-1">
              {perspective.evidence.map((e, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CombatPage() {
  const [records, setRecords] = useState<SavedTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [phase, setPhase] = useState<'diagnosis' | 'treatment'>('diagnosis')
  const [diagnosisResult, setDiagnosisResult] = useState<CombatResult | null>(null)
  const [treatmentResult, setTreatmentResult] = useState<CombatResult | null>(null)
  const [expandedPerspectives, setExpandedPerspectives] = useState<Set<string>>(new Set())
  const [streamingContent, setStreamingContent] = useState('')
  const { trackEvent } = useAnalytics()

  // Load records on mount
  useEffect(() => {
    const data = localStorage.getItem('axestack-translations-data')
    if (!data) {
      setLoading(false)
      return
    }

    try {
      const translations = JSON.parse(data)
      const recordList: SavedTranslation[] = Object.values(translations)
      recordList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecords(recordList)
    } catch (e) {
      console.error('Failed to load records:', e)
    }
    setLoading(false)
  }, [])

  const runCombat = async (targetPhase: 'diagnosis' | 'treatment') => {
    if (records.length === 0) return

    setGenerating(true)
    setPhase(targetPhase)
    setStreamingContent('')

    try {
      const response = await fetch('/api/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: targetPhase,
          records: records.map(r => ({
            fileName: r.fileName,
            documentType: r.documentType,
            result: r.result,
            documentText: r.documentText?.slice(0, 5000) // Limit text size
          })),
          previousDiagnosis: targetPhase === 'treatment' ? diagnosisResult : null
        })
      })

      if (!response.ok) throw new Error('Combat failed')

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullContent += chunk
        setStreamingContent(fullContent)
      }

      // Parse the final result
      try {
        const result = JSON.parse(fullContent)
        if (targetPhase === 'diagnosis') {
          setDiagnosisResult(result)
        } else {
          setTreatmentResult(result)
        }

        trackEvent('combat_completed', {
          phase: targetPhase,
          records_count: records.length
        })
      } catch (e) {
        console.error('Failed to parse combat result:', e)
      }

    } catch (err) {
      console.error('Combat error:', err)
    } finally {
      setGenerating(false)
      setStreamingContent('')
    }
  }

  const togglePerspective = (name: string) => {
    setExpandedPerspectives(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const currentResult = phase === 'diagnosis' ? diagnosisResult : treatmentResult

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header - Clean & Refined */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/records" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1.5 group">
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            Records
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">
              Combat
            </span>
          </Link>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {records.length === 0 ? (
          /* No records state - Inviting design */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
              <Swords className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Debate?</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Upload your medical records first. Three AI perspectives will analyze and debate your case.
            </p>
            <Link
              href="/records"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <FileText className="w-5 h-5" />
              Upload Records to Start
            </Link>
          </div>
        ) : (
          /* Has records - show combat interface */
          <div className="space-y-8">
            {/* Hero Section - Bold & Dynamic */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pb-6">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
                    <Swords className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-white/90">Adversarial AI Analysis</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-center text-white mb-3">
                  Cancer<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">Combat</span>
                </h1>
                <p className="text-center text-slate-300 max-w-md mx-auto text-sm">
                  Three AI perspectives debate your case so you see all options, not just one answer.
                </p>

                {/* AI Trio Animation */}
                <div className="mt-6">
                  <AITrioAnimation isActive={generating} />
                </div>

                {/* Records pill */}
                <div className="flex justify-center mt-4">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-white/80">
                      {records.length} record{records.length !== 1 ? 's' : ''} • {records[0]?.result?.cancer_specific?.cancer_type || 'Ready to analyze'}
                    </span>
                    <Link href="/records" className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Buttons - Above Double Diamond, More Appealing CTAs */}
            {!currentResult && !generating && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => runCombat('diagnosis')}
                  className="group relative p-6 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 rounded-2xl text-left transition-all shadow-sm hover:shadow-lg"
                >
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      <Play className="w-3 h-3" />
                      Start Here
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">Diagnosis Debate</h3>
                  <p className="text-sm text-slate-600">
                    Validate your diagnosis from 3 perspectives
                  </p>
                </button>

                <button
                  onClick={() => runCombat('treatment')}
                  disabled={!diagnosisResult}
                  className={`group relative p-6 rounded-2xl text-left transition-all ${
                    diagnosisResult
                      ? 'bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-orange-400 shadow-sm hover:shadow-lg'
                      : 'bg-slate-50 border-2 border-dashed border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {diagnosisResult && (
                    <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      diagnosisResult
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/25'
                        : 'bg-slate-200'
                    }`}>
                      <Sparkles className={`w-6 h-6 ${diagnosisResult ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    {!diagnosisResult && (
                      <span className="text-xs text-slate-400 font-medium">Complete diagnosis first</span>
                    )}
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${diagnosisResult ? 'text-slate-900' : 'text-slate-400'}`}>Treatment Debate</h3>
                  <p className={`text-sm ${diagnosisResult ? 'text-slate-600' : 'text-slate-400'}`}>
                    Explore all treatment options
                  </p>
                </button>
              </div>
            )}

            {/* Double Diamond - Visual Process */}
            <DoubleDiamond
              activeDiamond={generating ? phase : null}
              completedPhases={{ diagnosis: !!diagnosisResult, treatment: !!treatmentResult }}
            />

            {/* Generating State - Enhanced with Animation */}
            {generating && (
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-8 shadow-lg">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium animate-pulse">
                    <Zap className="w-4 h-4" />
                    AI Debate in Progress
                  </div>
                </div>

                {/* Active AI Trio */}
                <AITrioAnimation isActive={true} />

                <div className="text-center mt-6">
                  <h3 className="font-bold text-xl text-slate-900 mb-2">
                    {phase === 'diagnosis' ? 'Analyzing Your Diagnosis' : 'Debating Treatment Options'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Guidelines • Research • Integrative perspectives are deliberating...
                  </p>
                </div>

                {streamingContent && (
                  <div className="mt-6 text-left text-sm text-slate-600 max-h-40 overflow-y-auto bg-slate-100 rounded-xl p-4 border border-slate-200">
                    <TypewriterMarkdown text={streamingContent} instantRender />
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {currentResult && !generating && (
              <div className="space-y-6">
                {/* Question being debated */}
                <div className="bg-slate-900 text-white rounded-2xl p-6">
                  <p className="text-sm text-slate-400 mb-2 uppercase tracking-wide">
                    {phase === 'diagnosis' ? 'Diagnosis Question' : 'Treatment Question'}
                  </p>
                  <h2 className="text-xl font-semibold">{currentResult.question}</h2>
                </div>

                {/* Three Perspectives */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-orange-500" />
                    Three Perspectives
                  </h3>

                  {currentResult.perspectives.map((p) => (
                    <PerspectiveCard
                      key={p.name}
                      perspective={p}
                      isExpanded={expandedPerspectives.has(p.name)}
                      onToggle={() => togglePerspective(p.name)}
                    />
                  ))}
                </div>

                {/* Synthesis */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Synthesis
                  </h3>
                  <p className="text-slate-700 mb-4">{currentResult.synthesis}</p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-medium text-emerald-600 uppercase mb-2">Where They Agree</p>
                      <ul className="space-y-1">
                        {currentResult.consensus.map((c, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs font-medium text-orange-600 uppercase mb-2">Where They Diverge</p>
                      <ul className="space-y-1">
                        {currentResult.divergence.map((d, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <Swords className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="flex gap-4">
                  {phase === 'diagnosis' && (
                    <button
                      onClick={() => runCombat('treatment')}
                      className="group flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
                    >
                      <span>Continue to Treatment Debate</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (phase === 'diagnosis') {
                        setDiagnosisResult(null)
                      } else {
                        setTreatmentResult(null)
                      }
                    }}
                    className="px-6 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-medium transition-all"
                  >
                    Re-run
                  </button>
                </div>

                {/* Completion & Gamification - Show after treatment phase */}
                {treatmentResult && phase === 'treatment' && (
                  <div className="bg-gradient-to-br from-violet-50 via-white to-orange-50 border-2 border-violet-200 rounded-2xl p-6 space-y-5">
                    {/* Completion Header */}
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full text-sm font-bold shadow-lg shadow-orange-400/30 mb-3">
                        <Trophy className="w-5 h-5" />
                        Combat Complete!
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">You've explored all perspectives</h3>
                      <p className="text-slate-600 text-sm mt-1">Both diagnosis and treatment debates are complete</p>
                    </div>

                    {/* Progress Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Target className="w-5 h-5 text-violet-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">2</p>
                        <p className="text-xs text-slate-500">Phases Completed</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Swords className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">6</p>
                        <p className="text-xs text-slate-500">AI Perspectives</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Star className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{records.length}</p>
                        <p className="text-xs text-slate-500">Records Analyzed</p>
                      </div>
                    </div>

                    {/* Badges Earned */}
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase mb-3">Badges Earned</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                          🎯 Diagnosis Debater
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          ⚔️ Treatment Tactician
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                          🧠 Multi-Perspective Thinker
                        </span>
                      </div>
                    </div>

                    {/* Export & Share Actions - Clean style */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          // Generate PDF content
                          const content = `
CancerCombat Report
Generated: ${new Date().toLocaleDateString()}

=== DIAGNOSIS DEBATE ===
Question: ${diagnosisResult?.question}

NCCN Guidelines: ${diagnosisResult?.perspectives.find(p => p.name === 'NCCN Guidelines')?.recommendation}
Emerging Research: ${diagnosisResult?.perspectives.find(p => p.name === 'Emerging Research')?.recommendation}
Integrative Oncology: ${diagnosisResult?.perspectives.find(p => p.name === 'Integrative Oncology')?.recommendation}

Synthesis: ${diagnosisResult?.synthesis}

=== TREATMENT DEBATE ===
Question: ${treatmentResult?.question}

NCCN Guidelines: ${treatmentResult?.perspectives.find(p => p.name === 'NCCN Guidelines')?.recommendation}
Emerging Research: ${treatmentResult?.perspectives.find(p => p.name === 'Emerging Research')?.recommendation}
Integrative Oncology: ${treatmentResult?.perspectives.find(p => p.name === 'Integrative Oncology')?.recommendation}

Synthesis: ${treatmentResult?.synthesis}

---
Generated by CancerCombat at opencancer.ai
                          `.trim()

                          // Create and download file
                          const blob = new Blob([content], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `cancer-combat-report-${new Date().toISOString().split('T')[0]}.txt`
                          a.click()
                          URL.revokeObjectURL(url)

                          trackEvent('combat_exported', { format: 'txt' })
                        }}
                        className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-sm"
                      >
                        <Download className="w-5 h-5" />
                        Export Report
                      </button>
                      <button
                        onClick={() => {
                          const shareText = `I just completed CancerCombat on opencancer.ai - explored 6 AI perspectives on my diagnosis and treatment options. Highly recommend for anyone navigating cancer.`
                          if (navigator.share) {
                            navigator.share({
                              title: 'CancerCombat Complete',
                              text: shareText,
                              url: 'https://opencancer.ai/combat'
                            })
                          } else {
                            navigator.clipboard.writeText(shareText + ' https://opencancer.ai/combat')
                            alert('Link copied to clipboard!')
                          }
                          trackEvent('combat_shared', {})
                        }}
                        className="flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 rounded-xl font-semibold transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                        Share
                      </button>
                    </div>

                    {/* Bring to your doctor */}
                    <div className="text-center pt-2">
                      <p className="text-sm text-slate-600">
                        📋 <span className="font-medium">Pro tip:</span> Bring this report to your next oncologist appointment as a conversation starter
                      </p>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-600">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-amber-800 font-medium">This is not medical advice</p>
                    <p className="text-sm text-amber-700 mt-1">
                      CancerCombat presents multiple perspectives to inform your conversations with your oncologist.
                      Always consult your medical team before making treatment decisions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

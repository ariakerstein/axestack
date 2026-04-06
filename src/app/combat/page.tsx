'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { FileText, Shield, FlaskConical, Leaf, ChevronDown, ChevronUp, Swords, ArrowRight, Sparkles, Target, CheckCircle2, Download, Share2, Trophy, Star, Play, Mail, Users, Sliders, Clock, Waves, Scale, Heart, GraduationCap } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useAuth } from '@/lib/auth'
import { getSessionId } from '@/lib/supabase'
import { ShareModal } from '@/components/ShareModal'
import { PerspectiveTuner, PerspectiveWeights } from '@/components/PerspectiveTuner'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Navbar } from '@/components/Navbar'
import { CombatFollowUpChat } from '@/components/CombatFollowUpChat'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
// Verification disabled - was causing page load issues
// import { CombatVerification, DetectedFinding, FindingCorrection } from '@/components/CombatVerification'

// 5 Perspective Types
type PerspectiveKey = 'guidelines' | 'aggressive' | 'precision' | 'conservative' | 'integrative'

// Animated AI Five Component - Five AI perspectives visualized
function AIFiveAnimation({ isActive, activePerspective }: { isActive: boolean, activePerspective?: PerspectiveKey | null }) {
  const perspectives = [
    { key: 'guidelines' as const, icon: Shield, label: 'Standard of Care', gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/30', text: 'text-blue-600', activeText: 'text-blue-700', ring: 'ring-blue-400/50' },
    { key: 'aggressive' as const, icon: FlaskConical, label: 'Emerging Evidence', gradient: 'from-violet-400 to-violet-600', shadow: 'shadow-violet-500/30', text: 'text-violet-600', activeText: 'text-violet-700', ring: 'ring-violet-400/50' },
    { key: 'precision' as const, icon: Target, label: 'Molecular/Targeted', gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/30', text: 'text-purple-600', activeText: 'text-purple-700', ring: 'ring-purple-400/50' },
    { key: 'conservative' as const, icon: Clock, label: 'Watch & Wait', gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/30', text: 'text-amber-600', activeText: 'text-amber-700', ring: 'ring-amber-400/50' },
    { key: 'integrative' as const, icon: Leaf, label: 'Whole Person', gradient: 'from-green-400 to-teal-500', shadow: 'shadow-green-500/30', text: 'text-green-600', activeText: 'text-green-700', ring: 'ring-green-400/50' },
  ]

  return (
    <div className="relative flex items-center justify-center gap-3 py-4">
      {perspectives.map((p) => {
        const Icon = p.icon
        const isActiveP = activePerspective === p.key
        return (
          <div key={p.key} className={`flex flex-col items-center transition-all duration-500 ${isActiveP ? 'scale-110' : ''}`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-lg ${p.shadow} transition-all duration-500 ${
              isActiveP ? `ring-4 ${p.ring} ring-offset-2` :
              isActive ? 'opacity-70' : ''
            }`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span className={`mt-1.5 text-[10px] font-semibold transition-all ${isActiveP ? p.activeText : p.text}`}>{p.label}</span>
          </div>
        )
      })}

      {/* Connecting line when active */}
      {isActive && (
        <div className="absolute top-1/2 left-[15%] w-[70%] h-0.5 bg-gradient-to-r from-blue-400 via-violet-400 to-green-400 rounded-full opacity-30" />
      )}
    </div>
  )
}

// Evidence Strength Meter - Shows what records you have and what's missing
function EvidenceStrengthMeter({ strength, missingData, recordTypes }: { strength: number, missingData: string[], recordTypes?: string[] }) {
  // Get human-readable description based on what they have
  const getDescription = () => {
    const types = recordTypes || []
    const hasPathology = types.some(t => t?.toLowerCase().includes('pathology') || t?.toLowerCase().includes('biopsy'))
    const hasImaging = types.some(t => t?.toLowerCase().includes('imaging') || t?.toLowerCase().includes('scan') || t?.toLowerCase().includes('mri') || t?.toLowerCase().includes('ct'))
    const hasLabs = types.some(t => t?.toLowerCase().includes('lab') || t?.toLowerCase().includes('blood') || t?.toLowerCase().includes('psa'))
    const hasGenomics = types.some(t => t?.toLowerCase().includes('genomic') || t?.toLowerCase().includes('genetic') || t?.toLowerCase().includes('molecular'))

    if (strength >= 80) {
      return { label: 'Strong case file', desc: 'Multiple record types for detailed analysis' }
    }
    if (strength >= 60) {
      if (hasPathology && hasImaging) return { label: 'Good foundation', desc: 'Has pathology + imaging' }
      if (hasPathology) return { label: 'Good foundation', desc: 'Has pathology report' }
      return { label: 'Good foundation', desc: `${types.length} record${types.length !== 1 ? 's' : ''} uploaded` }
    }
    if (strength >= 40) {
      return { label: 'Partial picture', desc: 'Add more records for deeper insights' }
    }
    return { label: 'Getting started', desc: 'Upload more records when available' }
  }

  const level = getDescription()
  const isStrong = strength >= 60

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
      {/* Header with animated swords */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Swords className="w-5 h-5 text-[#C66B4A] animate-pulse" />
            <div className="absolute inset-0 animate-ping opacity-30">
              <Swords className="w-5 h-5 text-[#C66B4A]" />
            </div>
          </div>
          <span className="text-sm font-semibold text-white">Perspectives Engaging</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isStrong ? 'bg-[#C66B4A]/20 text-[#C66B4A]' : 'bg-slate-600 text-slate-300'
        }`}>
          {level.label}
        </span>
      </div>

      {/* Progress bar with explanation */}
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C66B4A] to-[#E88B6A] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${strength}%` }}
        />
        <div
          className="absolute top-0 h-full bg-white/20 rounded-full animate-pulse"
          style={{ width: `${strength}%` }}
        />
      </div>

      {/* Status text - now explains what the bar means */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400">5 AI perspectives analyzing...</span>
        </div>
        <span className="text-xs text-slate-500">{level.desc}</span>
      </div>

      {/* Missing data suggestions - only show if significant gaps */}
      {missingData.length > 0 && strength < 60 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">
            Could strengthen analysis:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingData.slice(0, 3).map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-md border border-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Deliberation Theater - Sophisticated consultation view with auto-scroll
function DeliberationTheater({
  activePerspective,
  deliberationLog,
  records
}: {
  activePerspective: PerspectiveKey | null,
  deliberationLog: { perspective: string, thought: string }[],
  records?: { fileName: string, documentType: string }[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [deliberationLog.length])

  const perspectiveConfig = {
    guidelines: { icon: Shield, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100/50', borderColor: 'border-blue-200', textColor: 'text-blue-700', label: 'Standard of Care' },
    aggressive: { icon: FlaskConical, gradient: 'from-violet-500 to-violet-600', bgGradient: 'from-violet-50 to-violet-100/50', borderColor: 'border-violet-200', textColor: 'text-violet-700', label: 'Emerging Evidence' },
    precision: { icon: Target, gradient: 'from-purple-500 to-purple-600', bgGradient: 'from-purple-50 to-purple-100/50', borderColor: 'border-purple-200', textColor: 'text-purple-700', label: 'Molecular/Targeted' },
    conservative: { icon: Clock, gradient: 'from-amber-500 to-amber-600', bgGradient: 'from-amber-50 to-amber-100/50', borderColor: 'border-amber-200', textColor: 'text-amber-700', label: 'Watch & Wait' },
    integrative: { icon: Leaf, gradient: 'from-green-500 to-teal-500', bgGradient: 'from-green-50 to-teal-50', borderColor: 'border-green-200', textColor: 'text-green-700', label: 'Whole Person' },
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ThinkingIndicator size={20} variant="light" />
          <span className="text-sm font-semibold text-slate-700">Finding gaps in your case</span>
        </div>
        {records && records.length > 0 && (
          <div className="text-xs text-slate-500">
            Reviewing {records.length} record{records.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Records being reviewed - inline chips */}
      {records && records.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {records.slice(0, 4).map((r, i) => (
            <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full truncate max-w-[160px]">
              {r.fileName || r.documentType || `Record ${i + 1}`}
            </span>
          ))}
          {records.length > 4 && (
            <span className="text-xs px-2 py-1 text-slate-400">+{records.length - 4} more</span>
          )}
        </div>
      )}

      {/* Deliberation entries - cleaner, no heavy container */}
      <div ref={scrollRef} className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {deliberationLog.map((entry, i) => {
          const config = perspectiveConfig[entry.perspective as keyof typeof perspectiveConfig]
          if (!config) return null
          const Icon = config.icon

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${
                i === deliberationLog.length - 1
                  ? `bg-gradient-to-r ${config.bgGradient} border ${config.borderColor} shadow-sm`
                  : 'bg-slate-50/50 opacity-50'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-xs font-semibold ${config.textColor} mb-0.5`}>{config.label}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{entry.thought}</p>
              </div>
            </div>
          )
        })}

        {activePerspective && (
          <div className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm text-slate-500">Reviewing case details...</span>
          </div>
        )}

        {deliberationLog.length === 0 && !activePerspective && (
          <div className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm text-slate-500">Initializing consultation...</span>
          </div>
        )}
      </div>
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
  icon: 'shield' | 'flask' | 'target' | 'clock' | 'leaf' | 'swords'  // flask for Emerging Evidence
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
  // Enhanced fields for action hub
  urgency?: 'urgent' | 'timely' | 'routine'
  questionsForOncologist?: string[]
  recommendedTests?: string[]
  nextSteps?: string[]
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
          <span className={`text-sm font-semibold mb-3 ${completedPhases.diagnosis ? 'text-slate-600' : 'text-slate-700'}`}>
            Diagnosis
            {completedPhases.diagnosis && <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-500" />}
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
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'diagnosis' || completedPhases.diagnosis ? 'text-slate-500' : 'text-slate-400'}`}>Diverge</span>
              <p className="text-[9px] text-slate-400">Explore all</p>
            </div>
            <div className="text-center">
              <span className={`text-[10px] uppercase tracking-wide font-bold ${activeDiamond === 'diagnosis' || completedPhases.diagnosis ? 'text-slate-700' : 'text-slate-400'}`}>Converge</span>
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
            {completedPhases.treatment && <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-500" />}
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

// Perspective Card Component - With citations
function PerspectiveCard({ perspective, isExpanded, onToggle }: {
  perspective: Perspective
  isExpanded: boolean
  onToggle: () => void
}) {
  const iconMap: Record<string, typeof Shield> = {
    shield: Shield,
    swords: Swords,
    target: Target,
    clock: Clock,
    leaf: Leaf,
    flask: FlaskConical, // Legacy support
  }
  const Icon = iconMap[perspective.icon] || Shield

  const colorMap: Record<string, { bgGradient: string, border: string, text: string, iconGradient: string }> = {
    blue: { bgGradient: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', text: 'text-blue-800', iconGradient: 'from-blue-500 to-blue-600' },
    red: { bgGradient: 'from-red-50 to-red-100/50', border: 'border-red-200', text: 'text-red-800', iconGradient: 'from-red-500 to-red-600' },
    violet: { bgGradient: 'from-violet-50 to-violet-100/50', border: 'border-violet-200', text: 'text-violet-800', iconGradient: 'from-violet-500 to-violet-600' },
    amber: { bgGradient: 'from-amber-50 to-amber-100/50', border: 'border-amber-200', text: 'text-amber-800', iconGradient: 'from-amber-500 to-amber-600' },
    green: { bgGradient: 'from-green-50 to-teal-50', border: 'border-green-200', text: 'text-green-800', iconGradient: 'from-green-500 to-teal-500' },
    purple: { bgGradient: 'from-slate-50 to-slate-50', border: 'border-slate-200', text: 'text-slate-800', iconGradient: 'from-slate-500 to-slate-500' }, // Legacy
  }
  const colors = colorMap[perspective.color] || colorMap.blue

  return (
    <div className={`bg-gradient-to-r ${colors.bgGradient} border ${colors.border} rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.iconGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${colors.text}`}>{perspective.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{perspective.confidence}% confidence</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{perspective.recommendation}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Analysis</p>
            <p className="text-sm text-slate-700">{perspective.argument}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Supporting Evidence</p>
            <ul className="space-y-2">
              {perspective.evidence.map((e, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2 bg-white/50 rounded-lg p-2">
                  <span className="text-slate-400 mt-0.5 font-medium">{i + 1}.</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Citations placeholder */}
          <div className="pt-2 border-t border-slate-200/50">
            <p className="text-xs text-slate-400">
              Sources: NCCN Guidelines 2025, PubMed, ClinicalTrials.gov
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Action Hub - Contextual next steps
function ActionHub({
  result,
  records,
  onExpertClick,
  onShareClick
}: {
  result: CombatResult
  records: SavedTranslation[]
  onExpertClick: () => void
  onShareClick: (type: 'oncologist' | 'family' | 'self') => void
}) {
  // Determine which actions are relevant based on context
  const isUrgent = result.urgency === 'urgent' || result.synthesis?.toLowerCase().includes('urgent')
  const needsTests = (result.recommendedTests && result.recommendedTests.length > 0) ||
    result.synthesis?.toLowerCase().includes('test') ||
    result.synthesis?.toLowerCase().includes('biopsy')
  const mentionsTrials = result.synthesis?.toLowerCase().includes('trial') ||
    result.perspectives?.some(p => p.argument?.toLowerCase().includes('trial'))

  const cancerType = records[0]?.result?.cancer_specific?.cancer_type || ''

  return (
    <div className="space-y-4">
      {/* Urgency Banner */}
      {isUrgent && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Timely Action Recommended</p>
            <p className="text-sm text-white/90">The analysis suggests prioritizing follow-up within 7-10 days.</p>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center gap-2 pt-2">
        <ArrowRight className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-900">Take Action</h3>
      </div>

      {/* Action Cards Grid - Only show relevant ones */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Share with Oncologist - Always show */}
        <button
          onClick={() => onShareClick('oncologist')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Share with Oncologist</p>
          <p className="text-xs text-slate-500 mt-0.5">Professional summary</p>
        </button>

        {/* Share with Family - Always show with viral badge */}
        <button
          onClick={() => onShareClick('family')}
          className="p-4 bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all text-left group relative"
        >
          {/* Viral badge */}
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-amber-400 text-white text-[10px] font-bold rounded-full shadow-sm">
            + INVITE
          </span>
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Share with Family</p>
          <p className="text-xs text-green-600 mt-0.5">Simplified + invite link</p>
        </button>

        {/* Get Expert Validation - Always show */}
        <button
          onClick={onExpertClick}
          className="p-4 bg-gradient-to-br from-slate-50 to-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-500 flex items-center justify-center mb-3 shadow-sm">
            <Star className="w-5 h-5 text-white" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Get Expert Review</p>
          <p className="text-xs text-slate-600 mt-0.5">Tony or Emma</p>
        </button>

        {/* Clinical Trials - Only if mentioned */}
        {mentionsTrials && (
          <a
            href={`/trials${cancerType ? `?cancer=${encodeURIComponent(cancerType)}` : ''}`}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-slate-100 transition-colors">
              <FlaskConical className="w-5 h-5 text-slate-600" />
            </div>
            <p className="font-medium text-slate-900 text-sm">Find Clinical Trials</p>
            <p className="text-xs text-slate-500 mt-0.5">In your area</p>
          </a>
        )}

        {/* Explore Tests - Only if tests mentioned */}
        {needsTests && (
          <a
            href={`/tests${cancerType ? `?cancer=${encodeURIComponent(cancerType)}` : ''}`}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <p className="font-medium text-slate-900 text-sm">Explore Tests</p>
            <p className="text-xs text-slate-500 mt-0.5">With pricing info</p>
          </a>
        )}

        {/* Email to Self */}
        <button
          onClick={() => onShareClick('self')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all text-left group relative"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-slate-100 transition-colors">
            <Mail className="w-5 h-5 text-slate-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Email to Myself</p>
          <p className="text-xs text-slate-500 mt-0.5">Save for later</p>
        </button>
      </div>
    </div>
  )
}

// Synthesis Card - Clear next steps
function SynthesisCard({ result }: { result: CombatResult }) {
  // Generate questions and tests based on analysis if not provided
  const questionsForOncologist = result.questionsForOncologist || [
    `Based on the ${result.phase} analysis, what is your recommended timeline?`,
    `Are there any additional tests that would help clarify the approach?`,
    `What are the key factors in choosing between the options discussed?`
  ]

  const recommendedTests = result.recommendedTests || []

  // Extract potential tests from synthesis text
  const synthesisLower = result.synthesis?.toLowerCase() || ''
  const potentialTests: string[] = []
  if (synthesisLower.includes('genomic') || synthesisLower.includes('molecular')) {
    potentialTests.push('Genomic profiling (e.g., Foundation One CDx)')
  }
  if (synthesisLower.includes('biopsy') || synthesisLower.includes('liquid')) {
    potentialTests.push('Liquid biopsy for circulating tumor DNA')
  }
  if (synthesisLower.includes('pet') || synthesisLower.includes('scan')) {
    potentialTests.push('Updated imaging (PET-CT or MRI)')
  }
  if (synthesisLower.includes('mrd') || synthesisLower.includes('minimal residual')) {
    potentialTests.push('MRD (Minimal Residual Disease) testing')
  }

  const allTests = [...recommendedTests, ...potentialTests].slice(0, 4)

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-500 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-bold text-lg text-slate-900">Your Action Plan</h3>
      </div>

      {/* Synthesis Summary */}
      <div>
        <p className="text-sm text-slate-700 leading-relaxed">{result.synthesis}</p>
      </div>

      {/* Questions for Oncologist */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Questions for Your Oncologist
        </h4>
        <ol className="space-y-2">
          {questionsForOncologist.slice(0, 4).map((q, i) => (
            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
              <span className="font-semibold text-blue-600 mt-0.5">{i + 1}.</span>
              <span>"{q}"</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recommended Tests */}
      {allTests.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <h4 className="font-semibold text-orange-900 text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Tests to Discuss
          </h4>
          <ul className="space-y-2">
            {allTests.map((test, i) => (
              <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>{test}</span>
              </li>
            ))}
          </ul>
          <a
            href="/tests"
            className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 mt-3"
          >
            View all recommended tests
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Next Steps Checklist */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-semibold text-slate-900 text-sm mb-3">Next Steps</h4>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Review this analysis with your oncologist</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Discuss recommended tests and timeline</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Share summary with family/caregivers</span>
          </label>
          {result.synthesis?.toLowerCase().includes('trial') && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">Explore clinical trial options</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

// Expert type for the modal
interface ExpertOption {
  id: string
  name: string
  title: string
  organization?: string
  specialty: string
  image: string
  bio: string
  availability: string
  price: string
  priceAmount: number
  isFree: boolean
}

// Expert Consultation Modal with multi-step flow
function ExpertModal({
  isOpen,
  onClose,
  records,
  combatResult,
  preSelectExpertId
}: {
  isOpen: boolean
  onClose: () => void
  records: SavedTranslation[]
  combatResult?: CombatResult | null
  preSelectExpertId?: string | null
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedExpert, setSelectedExpert] = useState<ExpertOption | null>(null)
  const [recordSelection, setRecordSelection] = useState<'all' | 'choose'>('all')
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [includePatientBrief, setIncludePatientBrief] = useState(true)
  const [includeCombatAnalysis, setIncludeCombatAnalysis] = useState(true)
  const [signature, setSignature] = useState('')
  const [consentChecks, setConsentChecks] = useState({
    shareData: false,
    notMedicalAdvice: false,
    agreeTerms: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [question, setQuestion] = useState('')

  const experts: ExpertOption[] = [
    {
      id: 'tony-magliocco',
      name: 'Tony Magliocco, MD, FRCPC, FCAP',
      title: 'President & CEO, Board-Certified Pathologist',
      organization: 'Protean BioDiagnostics',
      specialty: 'Precision oncology, molecular diagnostics, biomarker-driven therapy',
      image: '/team/tony-magliocco.png',
      bio: '25+ years in pathology and molecular diagnostics. 200+ peer-reviewed publications. Expert in precision medicine and cancer diagnostics.',
      availability: '2-3 business days',
      price: '$650',
      priceAmount: 650,
      isFree: false
    },
    {
      id: 'emma-shtivelman',
      name: 'Emma Shtivelman, PhD',
      title: 'Cancer Research Scientist',
      organization: 'Cancer Commons',
      specialty: 'Integrative oncology, clinical trials',
      image: 'https://cdn.prod.website-files.com/68e0582d152c96961cd60580/6911c701f74c0c25d0ff3bc0_Emma-photo-cropped-600x600.jpeg',
      bio: 'Research scientist at Cancer Commons specializing in novel cancer therapies and integrative approaches. Extensive experience guiding patients through clinical trial options.',
      availability: '3-5 days',
      price: 'Free',
      priceAmount: 0,
      isFree: true
    }
  ]

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedExpert(null)
      setRecordSelection('all')
      setSelectedRecordIds(new Set())
      setIncludePatientBrief(true)
      setIncludeCombatAnalysis(true)
      setSignature('')
      setConsentChecks({ shareData: false, notMedicalAdvice: false, agreeTerms: false })
      setQuestion('')
    }
  }, [isOpen])

  // Pre-select expert when modal opens with preSelectExpertId
  useEffect(() => {
    if (isOpen && preSelectExpertId && !selectedExpert) {
      const expert = experts.find(e => e.id === preSelectExpertId)
      if (expert) {
        setSelectedExpert(expert)
        setStep(2) // Skip to step 2 (record selection)
      }
    }
  }, [isOpen, preSelectExpertId])

  const handleExpertSelect = (expert: ExpertOption) => {
    setSelectedExpert(expert)
    setStep(2)
  }

  const handleRecordToggle = (recordId: string) => {
    const newSet = new Set(selectedRecordIds)
    if (newSet.has(recordId)) {
      newSet.delete(recordId)
    } else {
      newSet.add(recordId)
    }
    setSelectedRecordIds(newSet)
  }

  const canProceedFromStep2 = recordSelection === 'all' || selectedRecordIds.size > 0 || includePatientBrief || includeCombatAnalysis

  const canProceedFromStep3 = signature.trim().length >= 2 &&
    consentChecks.shareData &&
    consentChecks.notMedicalAdvice &&
    consentChecks.agreeTerms

  const handleSubmit = async () => {
    if (!selectedExpert || !user) return
    setSubmitting(true)

    try {
      // Prepare records to share (full records with results for email)
      const recordsToShare = recordSelection === 'all'
        ? records
        : records.filter(r => selectedRecordIds.has(r.id))

      // For free consultations (Cancer Commons), use the email API
      if (selectedExpert.isFree) {
        const consultRes = await fetch('/api/expert/consult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.email,
            expertId: selectedExpert.id,
            expertName: selectedExpert.name,
            question: question || 'Please review my case and Combat analysis.',
            signature: signature,
            records: recordsToShare.map(r => ({
              id: r.id,
              fileName: r.fileName,
              documentType: r.documentType,
              result: r.result
            })),
            combatResult: includeCombatAnalysis ? combatResult : null,
            includePatientBrief,
            includeCombatAnalysis
          })
        })

        if (!consultRes.ok) {
          const errorData = await consultRes.json()
          throw new Error(errorData.error || 'Failed to send consultation request')
        }

        // Success - show confirmation
        setStep(4)
        return
      }

      // For paid consultations, use Supabase + Stripe
      const { supabase } = await import('@/lib/supabase')

      const consultationData = {
        user_id: user.id,
        user_email: user.email,
        expert_id: selectedExpert.id,
        expert_name: selectedExpert.name,
        question: question || 'Please review my case and Combat analysis.',
        selected_records: recordsToShare.map(r => r.id),
        include_patient_brief: includePatientBrief,
        include_combat_analysis: includeCombatAnalysis,
        combat_result: includeCombatAnalysis ? combatResult : null,
        signature: signature,
        consent_share_data: consentChecks.shareData,
        consent_not_medical_advice: consentChecks.notMedicalAdvice,
        consent_agree_terms: consentChecks.agreeTerms,
        price_amount: selectedExpert.priceAmount,
        status: 'awaiting_payment',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('expert_consultations')
        .insert(consultationData)
        .select()
        .single()

      if (error) throw error

      // Map expert to product ID
      const productId = selectedExpert.id === 'tony-magliocco'
        ? 'expert-tony-magliocco'
        : 'expert-review'

      // Create Stripe checkout session
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: user.id,
          email: user.email,
          metadata: {
            consultationId: data.id,
            expertId: selectedExpert.id,
            expertName: selectedExpert.name
          }
        })
      })

      if (checkoutRes.ok) {
        const { url } = await checkoutRes.json()
        if (url) {
          window.location.href = url
          return
        }
      } else {
        const errorData = await checkoutRes.json()
        throw new Error(errorData.error || 'Failed to create payment session')
      }
    } catch (err) {
      console.error('Error submitting consultation:', err)
      alert('Failed to submit consultation request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const stepTitles = {
    1: 'Select Expert',
    2: 'Share Records',
    3: 'Consent & Review',
    4: 'Confirmation'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 p-6 rounded-t-2xl z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-white">Expert Consultation</h2>
          <p className="text-slate-400 mt-1">Step {step} of 4: {stepTitles[step]}</p>

          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-green-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Select Expert */}
          {step === 1 && (
            <div className="space-y-4">
              {experts.map((expert) => (
                <div
                  key={expert.id}
                  onClick={() => handleExpertSelect(expert)}
                  className={`border rounded-xl p-5 transition-all cursor-pointer ${
                    expert.isFree
                      ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-white hover:border-green-400 hover:shadow-lg'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-lg'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">{expert.name}</h3>
                          <p className="text-sm text-slate-600 font-medium">{expert.title}</p>
                          {expert.organization && (
                            <p className="text-xs text-green-600 font-medium">{expert.organization}</p>
                          )}
                        </div>
                        {expert.isFree ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            FREE
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                            {expert.price}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{expert.specialty}</p>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{expert.bio}</p>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Response: {expert.availability}</span>
                        </div>
                        <span className={`px-4 py-2 text-sm font-semibold rounded-lg ${
                          expert.isFree
                            ? 'bg-slate-900 text-white'
                            : 'bg-[#C66B4A] text-white'
                        }`}>
                          Select →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Record Selection */}
          {step === 2 && selectedExpert && (
            <div className="space-y-6">
              {/* Selected expert summary */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <img src={selectedExpert.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{selectedExpert.name}</p>
                  <p className="text-xs text-slate-500">{selectedExpert.organization}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">What would you like to share?</h3>

                {/* Quick options */}
                <div className="space-y-3 mb-4">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
                    <input
                      type="radio"
                      name="recordSelection"
                      checked={recordSelection === 'all'}
                      onChange={() => setRecordSelection('all')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Share all my records ({records.length})</p>
                      <p className="text-sm text-slate-500">Includes all uploaded documents and analyses</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
                    <input
                      type="radio"
                      name="recordSelection"
                      checked={recordSelection === 'choose'}
                      onChange={() => setRecordSelection('choose')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Let me choose specific records</p>
                      <p className="text-sm text-slate-500">Select which documents to include</p>
                    </div>
                  </label>
                </div>

                {/* Record list when "choose" is selected */}
                {recordSelection === 'choose' && records.length > 0 && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {records.map((record) => (
                      <label key={record.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.has(record.id)}
                          onChange={() => handleRecordToggle(record.id)}
                          className="rounded"
                        />
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{record.fileName}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Additional options */}
                <div className="border-t mt-4 pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePatientBrief}
                      onChange={(e) => setIncludePatientBrief(e.target.checked)}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Include Patient Brief</p>
                      <p className="text-xs text-slate-500">AI-generated summary of your case</p>
                    </div>
                  </label>

                  {combatResult && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCombatAnalysis}
                        onChange={(e) => setIncludeCombatAnalysis(e.target.checked)}
                        className="rounded"
                      />
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Include Combat Analysis</p>
                        <p className="text-xs text-slate-500">Share the AI multi-perspective analysis</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Optional question */}
                <div className="border-t mt-4 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Any specific questions? (optional)
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., Should I consider clinical trials? What additional tests might help?"
                    className="w-full p-3 border rounded-lg text-sm resize-none h-20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedFromStep2}
                  className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                    canProceedFromStep2
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Continue to Consent →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Consent Form */}
          {step === 3 && selectedExpert && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Important Information</h4>
                <p className="text-sm text-amber-700">
                  This consultation provides educational information and a second perspective on your case.
                  It does not establish a physician-patient relationship and should not replace advice from your treating oncologist.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Please confirm:</h3>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecks.shareData}
                    onChange={(e) => setConsentChecks(prev => ({ ...prev, shareData: e.target.checked }))}
                    className="mt-1 rounded"
                  />
                  <span className="text-sm text-slate-700">
                    I consent to sharing my medical records and information with <strong>{selectedExpert.name}</strong> for the purpose of receiving educational guidance about my cancer care.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecks.notMedicalAdvice}
                    onChange={(e) => setConsentChecks(prev => ({ ...prev, notMedicalAdvice: e.target.checked }))}
                    className="mt-1 rounded"
                  />
                  <span className="text-sm text-slate-700">
                    I understand this consultation provides educational information only and does not constitute medical advice, diagnosis, or treatment recommendations.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecks.agreeTerms}
                    onChange={(e) => setConsentChecks(prev => ({ ...prev, agreeTerms: e.target.checked }))}
                    className="mt-1 rounded"
                  />
                  <span className="text-sm text-slate-700">
                    I agree to the <a href="/terms" className="text-blue-600 underline" target="_blank">Terms of Service</a> and <a href="/privacy" className="text-blue-600 underline" target="_blank">Privacy Policy</a>.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Electronic Signature (type your full name)
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Your full name"
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent"
                />
              </div>

              {/* Summary */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expert:</span>
                    <span className="font-medium text-slate-900">{selectedExpert.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Records:</span>
                    <span className="font-medium text-slate-900">
                      {recordSelection === 'all' ? `All (${records.length})` : `${selectedRecordIds.size} selected`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient Brief:</span>
                    <span className="font-medium text-slate-900">{includePatientBrief ? 'Yes' : 'No'}</span>
                  </div>
                  {combatResult && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Combat Analysis:</span>
                      <span className="font-medium text-slate-900">{includeCombatAnalysis ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-900 font-semibold">Total:</span>
                    <span className={`font-bold ${selectedExpert.isFree ? 'text-green-600' : 'text-slate-900'}`}>
                      {selectedExpert.isFree ? 'Free' : selectedExpert.price}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canProceedFromStep3 || submitting}
                  className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                    canProceedFromStep3 && !submitting
                      ? selectedExpert.isFree
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-[#C66B4A] text-white hover:bg-[#B35E40]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Submitting...' : selectedExpert.isFree ? 'Submit Request' : `Pay ${selectedExpert.price} →`}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && selectedExpert && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
              <p className="text-slate-600 mb-6">
                {selectedExpert.name} will review your case and respond within {selectedExpert.availability}.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                You'll receive an email notification when the response is ready.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CombatPageContent() {
  const [records, setRecords] = useState<SavedTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [phase, setPhase] = useState<'diagnosis' | 'treatment'>('diagnosis')
  const [diagnosisResult, setDiagnosisResult] = useState<CombatResult | null>(null)
  const [treatmentResult, setTreatmentResult] = useState<CombatResult | null>(null)
  const [expandedPerspectives, setExpandedPerspectives] = useState<Set<string>>(new Set())

  // Verification step state - disabled for now
  // const [showVerification, setShowVerification] = useState(false)
  // const [verificationFindings, setVerificationFindings] = useState<DetectedFinding[]>([])
  // const [pendingCorrections, setPendingCorrections] = useState<FindingCorrection[]>([])
  // const [extractingFindings, setExtractingFindings] = useState(false)
  // const [pendingPhase, setPendingPhase] = useState<'diagnosis' | 'treatment'>('diagnosis')

  // Outcome tracking - simple question after Combat
  const [showOutcomeQuestion, setShowOutcomeQuestion] = useState(false)
  const [outcomeAnswer, setOutcomeAnswer] = useState<string | null>(null)
  const [lastCombatId, setLastCombatId] = useState<string | null>(null)

  // Combat run tracking for upgrade prompts (anxiety loop detection)
  const [combatRunCount, setCombatRunCount] = useState(0)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false) // TODO: Check actual subscription status
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Load combat run count from localStorage (resets weekly)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('combat-run-tracker')
      if (stored) {
        const data = JSON.parse(stored)
        const weekStart = getWeekStart()
        if (data.weekStart === weekStart) {
          setCombatRunCount(data.count)
        } else {
          // New week, reset counter
          localStorage.setItem('combat-run-tracker', JSON.stringify({ weekStart, count: 0 }))
          setCombatRunCount(0)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Helper to get week start date string
  function getWeekStart(): string {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek
    const weekStart = new Date(now.setDate(diff))
    return weekStart.toISOString().split('T')[0]
  }

  // Increment combat run count
  function incrementCombatRuns() {
    const newCount = combatRunCount + 1
    setCombatRunCount(newCount)
    const weekStart = getWeekStart()
    localStorage.setItem('combat-run-tracker', JSON.stringify({ weekStart, count: newCount }))
    return newCount
  }

  // Load saved combat results from localStorage on mount
  useEffect(() => {
    try {
      const savedDiagnosis = localStorage.getItem('combat-diagnosis-result')
      const savedTreatment = localStorage.getItem('combat-treatment-result')
      if (savedDiagnosis) {
        setDiagnosisResult(JSON.parse(savedDiagnosis))
      }
      if (savedTreatment) {
        setTreatmentResult(JSON.parse(savedTreatment))
      }
    } catch (e) {
      console.error('Error loading saved combat results:', e)
    }
  }, [])
  const [streamingContent, setStreamingContent] = useState('')
  const { trackEvent } = useAnalytics()
  const { user, loading: authLoading } = useAuth()

  // Deliberation theater state
  const [activePerspective, setActivePerspective] = useState<PerspectiveKey | null>(null)
  const [deliberationLog, setDeliberationLog] = useState<{ perspective: string, thought: string }[]>([])

  // Expert modal state
  const [showExpertModal, setShowExpertModal] = useState(false)
  const [preSelectExpertId, setPreSelectExpertId] = useState<string | null>(null)

  // Check URL params for expert selection (e.g., ?expert=tony-magliocco)
  const searchParams = useSearchParams()
  useEffect(() => {
    const expertParam = searchParams.get('expert')
    if (expertParam) {
      // Handle both 'pathology' (legacy) and direct expert IDs
      const expertId = expertParam === 'pathology' ? 'tony-magliocco' : expertParam
      setPreSelectExpertId(expertId)
      setShowExpertModal(true)
    }
  }, [searchParams])

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareType, setShareType] = useState<'oncologist' | 'family' | 'self'>('oncologist')

  // Communication style preference
  type CommunicationStyle = 'gentle' | 'balanced' | 'research'
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle>('balanced')

  // Load communication style from profile on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('patient-profile')
      if (savedProfile) {
        const p = JSON.parse(savedProfile)
        if (p.communicationStyle) {
          setCommunicationStyle(p.communicationStyle)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isPremium] = useState(false) // TODO: Check actual premium status from user profile

  // Perspective weights for tuning (5 perspectives)
  const [weights, setWeights] = useState<PerspectiveWeights>({
    guidelines: 50,
    aggressive: 50,
    precision: 50,
    conservative: 50,
    integrative: 50
  })

  const { logCombatRun } = useActivityLog()

  const handleShareClick = (type: 'oncologist' | 'family' | 'self') => {
    setShareType(type)
    setShareModalOpen(true)
  }

  // Evidence strength (calculated from records completeness)
  const calculateEvidenceStrength = () => {
    if (records.length === 0) return 0
    let strength = 20 // Base for having any records

    // Check for various data points
    const hasPathology = records.some(r => r.documentType?.toLowerCase().includes('pathology'))
    const hasImaging = records.some(r => r.documentType?.toLowerCase().includes('imaging') || r.documentType?.toLowerCase().includes('scan'))
    const hasLabs = records.some(r => r.documentType?.toLowerCase().includes('lab'))
    const hasBiomarkers = records.some(r => r.result?.cancer_specific?.biomarkers?.length > 0)
    const hasStage = records.some(r => r.result?.cancer_specific?.stage)
    const hasGrade = records.some(r => r.result?.cancer_specific?.grade)
    const multipleRecords = records.length >= 3

    if (hasPathology) strength += 15
    if (hasImaging) strength += 10
    if (hasLabs) strength += 10
    if (hasBiomarkers) strength += 15
    if (hasStage) strength += 10
    if (hasGrade) strength += 10
    if (multipleRecords) strength += 10

    return Math.min(strength, 100)
  }

  const getMissingData = () => {
    const missing: string[] = []
    const hasPathology = records.some(r => r.documentType?.toLowerCase().includes('pathology'))
    const hasBiomarkers = records.some(r => r.result?.cancer_specific?.biomarkers?.length > 0)
    const hasImaging = records.some(r => r.documentType?.toLowerCase().includes('imaging') || r.documentType?.toLowerCase().includes('scan'))
    const hasGenomics = records.some(r => r.documentType?.toLowerCase().includes('genomic') || r.documentType?.toLowerCase().includes('ngs'))

    if (!hasPathology) missing.push('Pathology report')
    if (!hasBiomarkers) missing.push('Biomarker testing')
    if (!hasImaging) missing.push('Recent imaging')
    if (!hasGenomics) missing.push('Genomic profiling')
    if (records.length < 3) missing.push('Additional records')

    return missing
  }

  // Simulate deliberation progression with 5 perspectives
  const simulateDeliberation = () => {
    const deliberations = [
      { perspective: 'guidelines', thought: 'Reviewing NCCN guidelines for this cancer type and stage...' },
      { perspective: 'guidelines', thought: 'Cross-referencing with standard-of-care protocols...' },
      { perspective: 'aggressive', thought: 'Scanning latest research and clinical trial data...' },
      { perspective: 'aggressive', thought: 'Reviewing emerging evidence and novel approaches...' },
      { perspective: 'precision', thought: 'Analyzing genomic profile and actionable mutations...' },
      { perspective: 'precision', thought: 'Matching targeted therapies to your tumor biology...' },
      { perspective: 'conservative', thought: 'Evaluating active surveillance options...' },
      { perspective: 'conservative', thought: 'Assessing treatment de-escalation possibilities...' },
      { perspective: 'integrative', thought: 'Reviewing quality-of-life considerations...' },
      { perspective: 'integrative', thought: 'Analyzing supportive care and whole-person approaches...' },
    ]

    setDeliberationLog([])
    let index = 0

    const addNext = () => {
      if (index < deliberations.length) {
        const entry = deliberations[index]
        setActivePerspective(entry.perspective as PerspectiveKey)
        setDeliberationLog(prev => [...prev, entry])
        index++
        setTimeout(addNext, 1500 + Math.random() * 1000) // Slightly faster for 5 perspectives
      } else {
        setActivePerspective(null)
      }
    }

    setTimeout(addNext, 500)
  }

  // Helper to fetch cloud records
  const fetchCloudRecords = async (localRecords: SavedTranslation[]) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        console.log('Combat: Fetching cloud records with token')
        const response = await fetch('/api/records/save', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const { records: cloudRecords } = await response.json()
          console.log('Combat: Fetched', cloudRecords?.length || 0, 'records from cloud')

          if (cloudRecords && cloudRecords.length > 0) {
            // Merge cloud records with localStorage by fileName (more reliable than ID)
            const localFileNames = new Set(localRecords.map(r => r.fileName?.toLowerCase()))
            const newRecords = cloudRecords.filter((r: SavedTranslation) =>
              !localFileNames.has(r.fileName?.toLowerCase())
            )

            if (newRecords.length > 0) {
              console.log('Combat: Adding', newRecords.length, 'new records from cloud')
              // Add to localStorage
              const existingData = JSON.parse(localStorage.getItem('axestack-translations-data') || '{}')
              newRecords.forEach((r: SavedTranslation) => {
                existingData[r.id] = {
                  id: r.id,
                  fileName: r.fileName,
                  date: r.date,
                  documentType: r.documentType,
                  result: r.result,
                  documentText: '',
                }
              })
              localStorage.setItem('axestack-translations-data', JSON.stringify(existingData))

              // Update state with merged records
              const merged = [...newRecords, ...localRecords]
              merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              setRecords(merged)
              return true
            } else if (localRecords.length === 0) {
              // No local records - use cloud records directly
              console.log('Combat: Using cloud records (no local)')
              setRecords(cloudRecords)
              // Also save to localStorage for offline access
              const newData: Record<string, SavedTranslation> = {}
              cloudRecords.forEach((r: SavedTranslation) => {
                newData[r.id] = {
                  id: r.id,
                  fileName: r.fileName,
                  date: r.date,
                  documentType: r.documentType,
                  result: r.result,
                  documentText: '',
                }
              })
              localStorage.setItem('axestack-translations-data', JSON.stringify(newData))
              return true
            }
          }
        }
      }
    } catch (err) {
      console.error('Combat: Failed to fetch cloud records:', err)
    }
    return false
  }

  // Load records on mount - from localStorage IMMEDIATELY, then cloud in background
  useEffect(() => {
    if (typeof window === 'undefined') return

    // FAST: Load from localStorage synchronously and show UI immediately
    const data = localStorage.getItem('axestack-translations-data')
    let localRecords: SavedTranslation[] = []

    if (data) {
      try {
        const translations = JSON.parse(data)
        localRecords = Object.values(translations)
        localRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        console.log('Combat: Loaded', localRecords.length, 'records from localStorage')
        setRecords(localRecords)
      } catch (e) {
        console.error('Combat: Failed to load local records:', e)
      }
    } else {
      console.log('Combat: No records in localStorage')
    }

    // Show UI immediately - don't block on auth
    setLoading(false)
  }, []) // Run once on mount

  // Fetch cloud records in background when auth is ready
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (authLoading) return // Wait for auth to settle

    const fetchCloud = async () => {
      const data = localStorage.getItem('axestack-translations-data')
      let localRecords: SavedTranslation[] = []
      if (data) {
        try {
          localRecords = Object.values(JSON.parse(data))
        } catch { /* ignore */ }
      }

      // Fetch from cloud (works with or without user - uses direct session check)
      await fetchCloudRecords(localRecords)
    }

    fetchCloud()
  }, [authLoading, user])

  // Verification functions disabled - were causing page load issues
  /*
  const extractFindings = async () => { ... }
  const startCombatWithVerification = async () => { ... }
  const handleVerificationConfirm = () => { ... }
  const handleVerificationSkip = () => { ... }
  */

  const runCombat = async (targetPhase: 'diagnosis' | 'treatment', corrections: { findingId: string; originalValue: string; correctedValue: string; correctionType: string; note?: string }[] = []) => {
    if (records.length === 0) return

    // Track combat runs for upgrade prompt (anxiety loop detection)
    const runCount = incrementCombatRuns()

    setGenerating(true)
    setPhase(targetPhase)
    setStreamingContent('')
    simulateDeliberation() // Start the deliberation theater

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
          previousDiagnosis: targetPhase === 'treatment' ? diagnosisResult : null,
          weights: weights, // Pass perspective tuning weights
          userId: user?.id, // Pass userId for response_evaluations tracking
          communicationStyle, // Pass communication preference
          corrections, // Pass patient corrections from verification step
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Combat API error response:', errorData)
        throw new Error(errorData.details || errorData.error || 'Combat failed')
      }

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
          localStorage.setItem('combat-diagnosis-result', JSON.stringify(result))
        } else {
          setTreatmentResult(result)
          localStorage.setItem('combat-treatment-result', JSON.stringify(result))
        }

        trackEvent('combat_completed', {
          phase: targetPhase,
          records_count: records.length
        })

        // Log activity for patient graph
        logCombatRun({
          phase: targetPhase,
          recordsCount: records.length,
          evidenceStrength: calculateEvidenceStrength(),
        })

        // Save to Supabase
        const sessionId = getSessionId()
        const cancerType = records[0]?.result?.cancer_specific?.cancer_type || null
        const documentTypes = [...new Set(records.map(r => r.documentType).filter(Boolean))]

        fetch('/api/combat/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId: user?.id || null,
            phase: targetPhase,
            question: result.question,
            perspectives: result.perspectives,
            synthesis: result.synthesis,
            consensus: result.consensus,
            divergence: result.divergence,
            recordsSummary: {
              count: records.length,
              cancer_type: cancerType,
              document_types: documentTypes,
            },
            evidenceStrength: calculateEvidenceStrength(),
          })
        }).then(async res => {
          if (res.ok) {
            console.log('Combat analysis saved to Supabase')
            const data = await res.json()
            // Store combat ID for outcome linking
            if (data.data?.id) {
              setLastCombatId(data.data.id)
            }
            // Show outcome question after a brief delay
            setTimeout(() => {
              setShowOutcomeQuestion(true)
            }, 2000)
          } else {
            console.error('Failed to save combat analysis')
          }
        }).catch(err => {
          console.error('Error saving combat analysis:', err)
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

  // Save outcome to the knowledge graph
  const saveOutcome = async (answer: string) => {
    setOutcomeAnswer(answer)
    setShowOutcomeQuestion(false)

    // Save to graph as an outcome entity
    try {
      const sessionId = getSessionId()
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType: 'combat_outcome',
          userId: user?.id || null,
          sessionId,
          metadata: {
            outcome: answer,
            combatId: lastCombatId,
            phase,
            question: 'Did this change what you plan to discuss with your doctor?',
          },
        }),
      })

      trackEvent('combat_outcome_recorded', {
        outcome: answer,
        phase,
      })
    } catch (err) {
      console.error('Failed to save outcome:', err)
    }
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
    <main className="min-h-screen bg-white">
      {/* Outcome Question Modal - Simple, non-intrusive */}
      {showOutcomeQuestion && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-sm animate-in slide-in-from-bottom-4">
          <p className="text-sm font-medium text-slate-900 mb-3">
            Did this change what you plan to discuss with your doctor?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => saveOutcome('yes')}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => saveOutcome('maybe')}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Maybe
            </button>
            <button
              onClick={() => saveOutcome('no')}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              No
            </button>
          </div>
          <button
            onClick={() => setShowOutcomeQuestion(false)}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600 w-full text-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {records.length === 0 ? (
          /* No records state - Clear prompt to upload */
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6 border border-slate-200">
              <FileText className="w-12 h-12 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Upload Records to Begin</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              CancerCombat analyzes your medical records from five expert perspectives:
              Standard of Care, Emerging Evidence, Molecular/Targeted, Watch & Wait, and Whole Person.
            </p>

            <Link
              href="/records"
              className="inline-flex items-center gap-2 bg-[#C66B4A] hover:bg-[#B35E40] text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-[#C66B4A]/25 hover:shadow-xl"
            >
              <FileText className="w-5 h-5" />
              Upload Your Records
            </Link>

            <p className="text-xs text-slate-400 mt-4">
              Pathology reports, imaging, lab results, and clinical notes work best
            </p>
          </div>
        ) : (
          /* Has records - show combat interface */
          <div className="space-y-5">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Cancer<span className="text-[#C66B4A]">Combat</span>
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Five AI perspectives debate your case</p>
              </div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  diagnosisResult ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {diagnosisResult ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <div className={`w-6 h-0.5 ${diagnosisResult ? 'bg-slate-900' : 'bg-slate-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  treatmentResult ? 'bg-slate-900 text-white' : diagnosisResult ? 'bg-[#C66B4A] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {treatmentResult ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
              </div>
            </div>

            {/* Records Summary - Loaded and ready */}
            {!generating && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{records.length} record{records.length !== 1 ? 's' : ''} loaded</p>
                    <p className="text-sm text-slate-500">{records[0]?.result?.cancer_specific?.cancer_type || 'Ready for analysis'}</p>
                  </div>
                </div>
                <Link href="/records" className="text-sm text-slate-500 hover:text-slate-700">
                  Edit
                </Link>
              </div>
            )}

            {/* PRIMARY ACTION AREA */}
            {!currentResult && !generating && (
              <div className="space-y-5">
                {/* Intrigue text */}
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    What will five expert perspectives find?
                  </h2>
                  <p className="text-slate-500">
                    They&apos;ll examine your records and debate what your treatment plan might be missing.
                  </p>
                </div>

                {/* Pre-flight question: Response style */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">How should we explain the findings?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gentle' as CommunicationStyle, label: 'Gentle', desc: 'Plain language', icon: Heart, bgSelected: 'bg-rose-50', borderSelected: 'border-rose-200', iconColor: 'text-rose-500', iconSelected: 'text-rose-600' },
                      { id: 'balanced' as CommunicationStyle, label: 'Balanced', desc: 'Terms explained', icon: Scale, bgSelected: 'bg-slate-100', borderSelected: 'border-slate-300', iconColor: 'text-slate-400', iconSelected: 'text-slate-600' },
                      { id: 'research' as CommunicationStyle, label: 'Research', desc: 'With citations', icon: GraduationCap, bgSelected: 'bg-indigo-50', borderSelected: 'border-indigo-200', iconColor: 'text-indigo-400', iconSelected: 'text-indigo-600' },
                    ].map((style) => {
                      const Icon = style.icon
                      const isSelected = communicationStyle === style.id
                      return (
                        <button
                          key={style.id}
                          onClick={() => {
                            setCommunicationStyle(style.id)
                            try {
                              const saved = localStorage.getItem('patient-profile')
                              const profile = saved ? JSON.parse(saved) : {}
                              profile.communicationStyle = style.id
                              localStorage.setItem('patient-profile', JSON.stringify(profile))
                            } catch { /* ignore */ }
                          }}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-all ${
                            isSelected
                              ? `${style.bgSelected} border-2 ${style.borderSelected}`
                              : 'bg-white border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? style.iconSelected : style.iconColor}`} />
                          <p className="text-sm font-medium text-slate-900">{style.label}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">{style.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Standalone CTA Button with shadow */}
                <button
                  onClick={() => runCombat(diagnosisResult ? 'treatment' : 'diagnosis', [])}
                  className="w-full group py-4 px-6 bg-[#C66B4A] hover:bg-[#B35E40] rounded-xl text-white font-semibold text-lg shadow-lg shadow-[#C66B4A]/25 hover:shadow-xl hover:shadow-[#C66B4A]/30 transition-all flex items-center justify-center gap-3"
                >
                  <Swords className="w-5 h-5" />
                  {diagnosisResult ? 'Start Treatment Debate' : 'Start the Debate'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Advanced Settings - Collapsed */}
                <details className="text-center">
                  <summary className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-slate-600">
                    <Sliders className="w-4 h-4" />
                    Advanced settings
                  </summary>
                  <div className="mt-4 bg-slate-50 rounded-xl p-4">
                    <PerspectiveTuner
                      weights={weights}
                      onChange={setWeights}
                      compact={true}
                      isPremium={isPremium}
                      onUpgradeClick={() => setShowUpgradeModal(true)}
                    />
                  </div>
                </details>

                {/* Small disclaimer */}
                <p className="text-xs text-slate-400 text-center">
                  For informational purposes only. Always consult your oncologist.
                </p>
              </div>
            )}

            {/* Generating State */}
            {generating && (
              <div className="space-y-4">
                {/* Case Evidence at TOP - status indicator while processing */}
                <EvidenceStrengthMeter
                  strength={calculateEvidenceStrength()}
                  missingData={getMissingData()}
                  recordTypes={records.map(r => r.documentType)}
                />
                <DeliberationTheater
                  activePerspective={activePerspective}
                  deliberationLog={deliberationLog}
                  records={records.map(r => ({ fileName: r.fileName, documentType: r.documentType }))}
                />
              </div>
            )}


            {/* Results - Summary First */}
            {currentResult && !generating && (
              <div className="space-y-5">
                {/* Full synthesis at TOP - the main takeaway */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">Full Analysis</span>
                  </div>
                  <p className="text-lg leading-relaxed">{currentResult.synthesis}</p>
                </div>

                {/* Expert Review CTA - Orange, prominent */}
                <button
                  onClick={() => setShowExpertModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-[#C66B4A] hover:bg-[#B55D3E] rounded-xl shadow-sm transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Want a human oncologist to review?</p>
                      <p className="text-xs text-white/80">$199 • Written notes in 48 hours</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>

                {/* Key Findings Card */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <p className="font-semibold text-slate-900">
                      Key Findings — {records[0]?.result?.cancer_specific?.cancer_type || 'Your case'}
                    </p>
                  </div>

                  {/* Consensus & Divergence findings */}
                  <div className="p-5 space-y-3">
                    {/* Consensus findings */}
                    {currentResult.consensus.map((c, i) => (
                      <div key={`c-${i}`} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                        <p className="text-slate-700">{c}</p>
                      </div>
                    ))}
                    {/* Divergence findings */}
                    {currentResult.divergence.map((d, i) => (
                      <div key={`d-${i}`} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        <p className="text-slate-700">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question context - smaller */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    {phase === 'diagnosis' ? 'Diagnosis' : 'Treatment'} Question
                  </p>
                  <p className="text-sm text-slate-700">{currentResult.question}</p>
                </div>

                {/* Follow-up Chat + Expert Upsell - Simplified 2 actions */}
                <CombatFollowUpChat
                  combatResult={currentResult}
                  combatAnalysisId={lastCombatId || undefined}
                  onPerspectivesRevised={(updatedResult) => {
                    if (phase === 'diagnosis') {
                      setDiagnosisResult(updatedResult)
                      localStorage.setItem('combat-diagnosis-result', JSON.stringify(updatedResult))
                    } else {
                      setTreatmentResult(updatedResult)
                      localStorage.setItem('combat-treatment-result', JSON.stringify(updatedResult))
                    }
                  }}
                  onExpertClick={() => setShowExpertModal(true)}
                />

                {/* Perspectives - Collapsed by default with confidence bars */}
                <details className="group">
                  <summary className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Swords className="w-5 h-5 text-[#C66B4A]" />
                      <span className="font-semibold text-slate-900">View 5 Expert Perspectives</span>
                    </div>
                    <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-3 space-y-3">
                    {currentResult.perspectives.map((p) => (
                      <PerspectiveCard
                        key={p.name}
                        perspective={p}
                        isExpanded={expandedPerspectives.has(p.name)}
                        onToggle={() => togglePerspective(p.name)}
                      />
                    ))}
                  </div>
                </details>

                {/* Refine Analysis - Re-run with modifications */}
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => {
                      if (phase === 'diagnosis') {
                        setDiagnosisResult(null)
                        localStorage.removeItem('combat-diagnosis-result')
                      } else {
                        setTreatmentResult(null)
                        localStorage.removeItem('combat-treatment-result')
                      }
                    }}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Sliders className="w-4 h-4" />
                    Adjust & Re-run
                  </button>
                  <button
                    onClick={() => {
                      const content = `CancerCombat Analysis\n${'='.repeat(40)}\n\n${phase.toUpperCase()} QUESTION:\n${currentResult.question}\n\nBOTTOM LINE:\n${currentResult.synthesis}\n\n${currentResult.perspectives.map(p => `${p.name}: ${p.recommendation} (${p.confidence}%)`).join('\n')}\n\n---\nGenerated by CancerCombat at opencancer.ai`
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `cancer-combat-${phase}-${new Date().toISOString().split('T')[0]}.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Download analysis"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Action - Continue to Treatment (only after diagnosis) */}
                {phase === 'diagnosis' && (
                  <button
                    onClick={() => runCombat('treatment', [])}
                    className="group w-full py-3 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    Diagnosis looks right → Continue to Treatment
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* Completion Banner - Compact */}
                {treatmentResult && phase === 'treatment' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900">Analysis Complete</p>
                        <p className="text-sm text-green-700">5 perspectives reviewed across diagnosis & treatment</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        // Create shareable link for this specific analysis
                        const result = treatmentResult || diagnosisResult
                        if (!result) {
                          alert('No analysis to share')
                          return
                        }

                        try {
                          const response = await fetch('/api/share', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'combat',
                              question: result.question,
                              perspectives: result.perspectives,
                              synthesis: result.synthesis,
                              consensus: result.consensus,
                              divergence: result.divergence,
                              phase: result.phase,
                              cancerType: records[0]?.result?.cancer_specific?.cancer_type || null
                            })
                          })

                          const data = await response.json()
                          if (data.success && data.shareUrl) {
                            const shareText = `I ran CancerCombat on opencancer.ai - ${result.perspectives?.length || 10} AI perspectives analyzed my case:`
                            if (navigator.share) {
                              navigator.share({ title: 'My CancerCombat Analysis', text: shareText, url: data.shareUrl })
                            } else {
                              await navigator.clipboard.writeText(data.shareUrl)
                              alert('Share link copied to clipboard!')
                            }
                          }
                        } catch (error) {
                          console.error('Failed to create share link:', error)
                          // Fallback to generic share
                          navigator.clipboard.writeText('Check out CancerCombat: https://opencancer.ai/combat')
                          alert('Link copied!')
                        }
                      }}
                      className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                )}

                {/* Disclaimer - Compact */}
                <p className="text-xs text-slate-500 text-center py-2">
                  Not medical advice. Discuss findings with your oncologist.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expert Consultation Modal */}
      <ExpertModal
        isOpen={showExpertModal}
        onClose={() => {
          setShowExpertModal(false)
          setPreSelectExpertId(null)
        }}
        records={records}
        combatResult={diagnosisResult || treatmentResult}
        preSelectExpertId={preSelectExpertId}
      />

      {/* Share Modal */}
      {currentResult && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          shareType={shareType}
          result={currentResult}
          cancerType={records[0]?.result?.cancer_specific?.cancer_type}
          recordsCount={records.length}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="tuning"
      />
    </main>
  )
}

export default function CombatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>}>
      <CombatPageContent />
    </Suspense>
  )
}

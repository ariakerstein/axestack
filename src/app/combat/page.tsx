'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { FileText, Shield, FlaskConical, Leaf, ChevronDown, ChevronUp, Swords, ArrowRight, Sparkles, Target, CheckCircle2, Download, Share2, Trophy, Star, Play, Mail, Users, Sliders } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useAuth } from '@/lib/auth'
import { getSessionId } from '@/lib/supabase'
import { ShareModal } from '@/components/ShareModal'
import { PerspectiveTuner, PerspectiveWeights } from '@/components/PerspectiveTuner'
import { UpgradeModal } from '@/components/UpgradeModal'

// Animated AI Trio Component - Three AI perspectives visualized
function AITrioAnimation({ isActive, activePerspective }: { isActive: boolean, activePerspective?: 'guidelines' | 'research' | 'integrative' | null }) {
  return (
    <div className="relative h-32 flex items-center justify-center gap-6">
      {/* NCCN Guidelines - Shield */}
      <div className={`flex flex-col items-center transition-all duration-500 ${activePerspective === 'guidelines' ? 'scale-110' : ''}`}>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all duration-500 ${
          activePerspective === 'guidelines' ? 'ring-4 ring-blue-400/50 ring-offset-2' :
          isActive ? 'opacity-70' : ''
        }`}>
          <Shield className="w-8 h-8 text-white" />
        </div>
        <span className={`mt-2 text-xs font-semibold transition-all ${activePerspective === 'guidelines' ? 'text-blue-700' : 'text-blue-600'}`}>Guidelines</span>
      </div>

      {/* Emerging Research - Flask */}
      <div className={`flex flex-col items-center transition-all duration-500 ${activePerspective === 'research' ? 'scale-110' : ''}`}>
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30 transition-all duration-500 ${
          activePerspective === 'research' ? 'ring-4 ring-purple-400/50 ring-offset-2' :
          isActive ? 'opacity-70' : ''
        }`}>
          <FlaskConical className="w-10 h-10 text-white" />
        </div>
        <span className={`mt-2 text-xs font-semibold transition-all ${activePerspective === 'research' ? 'text-purple-700' : 'text-purple-600'}`}>Research</span>
      </div>

      {/* Integrative - Leaf */}
      <div className={`flex flex-col items-center transition-all duration-500 ${activePerspective === 'integrative' ? 'scale-110' : ''}`}>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all duration-500 ${
          activePerspective === 'integrative' ? 'ring-4 ring-emerald-400/50 ring-offset-2' :
          isActive ? 'opacity-70' : ''
        }`}>
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <span className={`mt-2 text-xs font-semibold transition-all ${activePerspective === 'integrative' ? 'text-emerald-700' : 'text-emerald-600'}`}>Integrative</span>
      </div>

      {/* Connecting line when active */}
      {isActive && (
        <div className="absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 rounded-full opacity-50" />
      )}
    </div>
  )
}

// Evidence Strength Meter - Sophisticated, professional design
function EvidenceStrengthMeter({ strength, missingData }: { strength: number, missingData: string[] }) {
  const getLevel = () => {
    if (strength >= 80) return { label: 'Comprehensive', color: 'violet' }
    if (strength >= 60) return { label: 'Substantial', color: 'violet' }
    if (strength >= 40) return { label: 'Partial', color: 'slate' }
    return { label: 'Limited', color: 'slate' }
  }
  const level = getLevel()

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">Case Evidence</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          level.color === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {level.label}
        </span>
      </div>

      {/* Elegant progress bar */}
      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${strength}%` }}
        />
      </div>

      {/* Missing data suggestions - sophisticated styling */}
      {missingData.length > 0 && strength < 80 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            Additional data that could inform the analysis:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingData.slice(0, 3).map((item, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-slate-50 text-slate-600 rounded-md border border-slate-200">
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
  activePerspective: 'guidelines' | 'research' | 'integrative' | null,
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
    guidelines: { icon: Shield, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-50 to-blue-100/50', borderColor: 'border-blue-200', textColor: 'text-blue-700', label: 'NCCN Guidelines' },
    research: { icon: FlaskConical, gradient: 'from-purple-500 to-fuchsia-500', bgGradient: 'from-purple-50 to-fuchsia-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', label: 'Emerging Research' },
    integrative: { icon: Leaf, gradient: 'from-emerald-500 to-teal-500', bgGradient: 'from-emerald-50 to-teal-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700', label: 'Integrative Oncology' },
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">Live Consultation</span>
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
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm text-slate-500">Reviewing case details...</span>
          </div>
        )}

        {deliberationLog.length === 0 && !activePerspective && (
          <div className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
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

// Perspective Card Component - With citations
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

  const colorMap: Record<string, { bgGradient: string, border: string, text: string, iconGradient: string }> = {
    blue: { bgGradient: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', text: 'text-blue-800', iconGradient: 'from-blue-500 to-blue-600' },
    purple: { bgGradient: 'from-purple-50 to-fuchsia-50', border: 'border-purple-200', text: 'text-purple-800', iconGradient: 'from-purple-500 to-fuchsia-500' },
    green: { bgGradient: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', text: 'text-emerald-800', iconGradient: 'from-emerald-500 to-teal-500' }
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
        <ArrowRight className="w-5 h-5 text-violet-500" />
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
          className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all text-left group relative"
        >
          {/* Viral badge */}
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-amber-400 text-white text-[10px] font-bold rounded-full shadow-sm">
            + INVITE
          </span>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Share with Family</p>
          <p className="text-xs text-emerald-600 mt-0.5">Simplified + invite link</p>
        </button>

        {/* Get Expert Validation - Always show */}
        <button
          onClick={onExpertClick}
          className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl hover:border-violet-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-3 shadow-sm">
            <Star className="w-5 h-5 text-white" />
          </div>
          <p className="font-medium text-slate-900 text-sm">Get Expert Review</p>
          <p className="text-xs text-violet-600 mt-0.5">Tony or Emma</p>
        </button>

        {/* Clinical Trials - Only if mentioned */}
        {mentionsTrials && (
          <a
            href={`/trials${cancerType ? `?cancer=${encodeURIComponent(cancerType)}` : ''}`}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
              <FlaskConical className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-medium text-slate-900 text-sm">Find Clinical Trials</p>
            <p className="text-xs text-slate-500 mt-0.5">In your area</p>
          </a>
        )}

        {/* Explore Tests - Only if tests mentioned */}
        {needsTests && (
          <a
            href={`/tests${cancerType ? `?cancer=${encodeURIComponent(cancerType)}` : ''}`}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-md transition-all text-left group"
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
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-md transition-all text-left group relative"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3 group-hover:bg-violet-100 transition-colors">
            <Mail className="w-5 h-5 text-violet-600" />
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
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
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Review this analysis with your oncologist</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Discuss recommended tests and timeline</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">Share summary with family/caregivers</span>
          </label>
          {result.synthesis?.toLowerCase().includes('trial') && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">Explore clinical trial options</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

// Expert Consultation Modal
function ExpertModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null

  const experts = [
    {
      name: 'Tony Magliocco, MD, PhD',
      title: 'Medical Oncologist & Pathologist',
      specialty: 'Precision oncology, biomarker-driven therapy',
      image: '/experts/tony-magliocco.jpg',
      bio: 'Former Chief Medical Officer at Protean BioDiagnostics. Expert in molecular diagnostics and personalized cancer treatment strategies.',
      availability: '2-3 days',
      price: '$650',
      isFree: false
    },
    {
      name: 'Emma Shtibelman, PhD',
      title: 'Cancer Research Scientist',
      organization: 'Cancer Commons',
      specialty: 'Integrative oncology, clinical trials',
      image: '/experts/emma-shtibelman.jpg',
      bio: 'Research scientist at Cancer Commons specializing in novel cancer therapies and integrative approaches. Extensive experience guiding patients through clinical trial options.',
      availability: '3-5 days',
      price: 'Free',
      isFree: true
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-white">Expert Consultation</h2>
          <p className="text-white/80 mt-1">Get personalized guidance from leading oncology experts</p>
        </div>

        {/* Experts */}
        <div className="p-6 space-y-4">
          {experts.map((expert, i) => (
            <div key={i} className={`border rounded-xl p-5 transition-all ${
              expert.isFree
                ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white hover:border-emerald-300'
                : 'border-slate-200 hover:border-violet-300 hover:shadow-md'
            }`}>
              <div className="flex gap-4">
                {/* Avatar - will use image when available */}
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {expert.image && (
                    <img
                      src={expert.image}
                      alt={expert.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  )}
                  <span className={`text-2xl font-bold text-violet-600 ${expert.image ? 'hidden' : ''}`}>
                    {expert.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{expert.name}</h3>
                      <p className="text-sm text-violet-600 font-medium">{expert.title}</p>
                      {expert.organization && (
                        <p className="text-xs text-emerald-600 font-medium">{expert.organization}</p>
                      )}
                    </div>
                    {expert.isFree && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        FREE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{expert.specialty}</p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{expert.bio}</p>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">Response time:</span>
                      <span className="text-slate-700 font-medium">{expert.availability}</span>
                      {!expert.isFree && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-900 font-bold">{expert.price}</span>
                        </>
                      )}
                    </div>
                    <button className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg ${
                      expert.isFree
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                    }`}>
                      {expert.isFree ? 'Request Consultation' : 'Book Consultation'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* What you get */}
          <div className="bg-slate-50 rounded-xl p-4 mt-6">
            <h4 className="font-semibold text-slate-900 mb-3">What's included:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                30-minute video consultation reviewing your CancerCombat analysis
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Personalized written summary with actionable next steps
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Questions to bring to your oncologist appointment
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                7-day follow-up support via secure messaging
              </li>
            </ul>
          </div>
        </div>
      </div>
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

  // Outcome tracking - simple question after Combat
  const [showOutcomeQuestion, setShowOutcomeQuestion] = useState(false)
  const [outcomeAnswer, setOutcomeAnswer] = useState<string | null>(null)
  const [lastCombatId, setLastCombatId] = useState<string | null>(null)

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
  const [activePerspective, setActivePerspective] = useState<'guidelines' | 'research' | 'integrative' | null>(null)
  const [deliberationLog, setDeliberationLog] = useState<{ perspective: string, thought: string }[]>([])

  // Expert modal state
  const [showExpertModal, setShowExpertModal] = useState(false)

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareType, setShareType] = useState<'oncologist' | 'family' | 'self'>('oncologist')

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isPremium] = useState(false) // TODO: Check actual premium status from user profile

  // Perspective weights for tuning
  const [weights, setWeights] = useState<PerspectiveWeights>({
    guidelines: 50,
    research: 50,
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

  // Simulate deliberation progression
  const simulateDeliberation = () => {
    const deliberations = [
      { perspective: 'guidelines', thought: 'Reviewing NCCN guidelines for this cancer type and stage...' },
      { perspective: 'guidelines', thought: 'Cross-referencing with standard-of-care protocols...' },
      { perspective: 'research', thought: 'Searching recent clinical trial data from 2024-2025...' },
      { perspective: 'research', thought: 'Analyzing emerging biomarker-targeted therapies...' },
      { perspective: 'integrative', thought: 'Evaluating quality-of-life considerations...' },
      { perspective: 'integrative', thought: 'Reviewing supportive care and complementary approaches...' },
    ]

    setDeliberationLog([])
    let index = 0

    const addNext = () => {
      if (index < deliberations.length) {
        const entry = deliberations[index]
        setActivePerspective(entry.perspective as 'guidelines' | 'research' | 'integrative')
        setDeliberationLog(prev => [...prev, entry])
        index++
        setTimeout(addNext, 2000 + Math.random() * 1500)
      } else {
        setActivePerspective(null)
      }
    }

    setTimeout(addNext, 500)
  }

  // Load records on mount - from localStorage first, then Supabase
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Timeout fallback - don't hang forever
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Combat: Auth timeout, proceeding without auth')
        setLoading(false)
      }
    }, 3000)

    const loadRecords = async () => {
      // Always load from localStorage first (fast, synchronous)
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

      // Wait for auth to settle before fetching from cloud
      if (authLoading) {
        // Don't set loading=false yet, wait for auth
        return
      }

      // Then, fetch from Supabase if user is authenticated
      if (user) {
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.access_token) {
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
                }
              }
            }
          }
        } catch (err) {
          console.error('Combat: Failed to fetch cloud records:', err)
        }
      }

      setLoading(false)
    }

    loadRecords()

    return () => clearTimeout(timeout)
  }, [user, authLoading, loading])

  const runCombat = async (targetPhase: 'diagnosis' | 'treatment') => {
    if (records.length === 0) return

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
          userId: user?.id // Pass userId for response_evaluations tracking
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Outcome Question Modal - Simple, non-intrusive */}
      {showOutcomeQuestion && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-sm animate-in slide-in-from-bottom-4">
          <p className="text-sm font-medium text-slate-900 mb-3">
            Did this change what you plan to discuss with your doctor?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => saveOutcome('yes')}
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
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
          /* No records state - Clear prompt to upload */
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mx-auto mb-6 border border-violet-200">
              <FileText className="w-12 h-12 text-violet-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Upload Records to Begin</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              CancerCombat analyzes your medical records from three expert perspectives:
              NCCN Guidelines, Emerging Research, and Integrative Oncology.
            </p>

            <Link
              href="/records"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl"
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
            {/* Audit in Progress Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔬</span>
              </div>
              <div>
                <p className="font-semibold text-amber-900">Medical Audit in Progress</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  For informational purposes only. Always consult your oncologist.
                </p>
              </div>
            </div>

            {/* Compact Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Cancer<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Combat</span>
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Three AI perspectives debate your case</p>
              </div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  diagnosisResult ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                }`}>
                  {diagnosisResult ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <div className={`w-6 h-0.5 ${diagnosisResult ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  treatmentResult ? 'bg-emerald-100 text-emerald-700' : diagnosisResult ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {treatmentResult ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
              </div>
            </div>

            {/* Records Summary with Edit */}
            {!generating && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="font-medium text-slate-900">{records.length} record{records.length !== 1 ? 's' : ''}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-slate-500">{records[0]?.result?.cancer_specific?.cancer_type || 'Ready to analyze'}</span>
                  </div>
                </div>
                <Link href="/records" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                  Edit
                </Link>
              </div>
            )}

            {/* Perspective Tuner - Only show before starting or between phases */}
            {!generating && !currentResult && (
              <PerspectiveTuner
                weights={weights}
                onChange={setWeights}
                compact={false}
                isPremium={isPremium}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            {/* Generating State */}
            {generating && (
              <div className="space-y-4">
                <DeliberationTheater
                  activePerspective={activePerspective}
                  deliberationLog={deliberationLog}
                  records={records.map(r => ({ fileName: r.fileName, documentType: r.documentType }))}
                />
                <EvidenceStrengthMeter
                  strength={calculateEvidenceStrength()}
                  missingData={getMissingData()}
                />
              </div>
            )}

            {/* Single CTA Button - Much cleaner */}
            {!currentResult && !generating && (
              <button
                onClick={() => runCombat(diagnosisResult ? 'treatment' : 'diagnosis')}
                className="w-full group p-5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 hover:from-violet-600 hover:via-fuchsia-600 hover:to-violet-600 rounded-xl text-center transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl text-white"
              >
                <div className="flex items-center justify-center gap-3">
                  <Swords className="w-6 h-6" />
                  <span className="font-bold text-lg">
                    {diagnosisResult ? 'Run Treatment Analysis' : 'Run Diagnosis Analysis'}
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-white/80 text-sm mt-2">
                  {diagnosisResult
                    ? 'Explore all treatment options with three expert perspectives'
                    : 'Get three expert perspectives on your diagnosis'
                  }
                </p>
              </button>
            )}

            {/* Results */}
            {currentResult && !generating && (
              <div className="space-y-6">
                {/* Evidence Strength - Persistent gamification */}
                <EvidenceStrengthMeter
                  strength={calculateEvidenceStrength()}
                  missingData={getMissingData()}
                />

                {/* Question being debated - Brand colors */}
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl p-6 shadow-lg shadow-violet-500/20">
                  <p className="text-sm text-white/70 mb-2 uppercase tracking-wide font-medium">
                    {phase === 'diagnosis' ? 'Diagnosis Question' : 'Treatment Question'}
                  </p>
                  <h2 className="text-xl font-semibold leading-relaxed">{currentResult.question}</h2>
                </div>

                {/* Quick Actions - Email, Download, Share */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`CancerCombat: ${phase === 'diagnosis' ? 'Diagnosis' : 'Treatment'} Analysis`)
                      const body = encodeURIComponent(`View my CancerCombat analysis at opencancer.ai/combat\n\nQuestion: ${currentResult.question}\n\nGenerated by opencancer.ai`)
                      window.open(`mailto:?subject=${subject}&body=${body}`)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Email
                  </button>
                  <button
                    onClick={() => {
                      const content = `CancerCombat Analysis\n${'='.repeat(40)}\n\n${phase.toUpperCase()} QUESTION:\n${currentResult.question}\n\n${currentResult.perspectives.map(p => `${p.name.toUpperCase()}\nConfidence: ${p.confidence}%\n${p.recommendation}\n\nEvidence:\n${p.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n`).join('\n')}\nSYNTHESIS:\n${currentResult.synthesis}\n\nCONSENSUS:\n${currentResult.consensus.join('\n')}\n\nDIVERGENCE:\n${currentResult.divergence.join('\n')}\n\n---\nGenerated by CancerCombat at opencancer.ai\n${new Date().toLocaleDateString()}`
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `cancer-combat-${phase}-${new Date().toISOString().split('T')[0]}.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      const shareText = `I just analyzed my ${phase} with CancerCombat - 3 AI perspectives (NCCN Guidelines, Research, Integrative) reviewed my case.`
                      if (navigator.share) {
                        navigator.share({ title: 'CancerCombat Analysis', text: shareText, url: 'https://opencancer.ai/combat' })
                      } else {
                        navigator.clipboard.writeText(shareText + ' https://opencancer.ai/combat')
                        alert('Link copied!')
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
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

                {/* Consensus & Divergence Summary */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
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
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
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

                {/* Synthesis Card - Your Action Plan */}
                <SynthesisCard result={currentResult} />

                {/* Action Hub - Contextual Next Steps */}
                <ActionHub
                  result={currentResult}
                  records={records}
                  onExpertClick={() => setShowExpertModal(true)}
                  onShareClick={handleShareClick}
                />

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
                        localStorage.removeItem('combat-diagnosis-result')
                      } else {
                        setTreatmentResult(null)
                        localStorage.removeItem('combat-treatment-result')
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

      {/* Expert Consultation Modal */}
      <ExpertModal isOpen={showExpertModal} onClose={() => setShowExpertModal(false)} />

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

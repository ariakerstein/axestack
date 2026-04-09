/**
 * Tool Recommender - Phase 1: Deterministic Intent × Entity Matching
 *
 * Uses question intent + patient context to recommend relevant discovery tools.
 * Designed for trust: predictable, explainable, restrained (0-1 recommendations).
 */

import { PatientContextObject } from './types'

// Tool catalog with metadata
export interface Tool {
  slug: string
  name: string
  description: string
  icon: string
  href: string
  requiresAuth: boolean
  requiresRecords: boolean
}

export const TOOL_CATALOG: Tool[] = [
  {
    slug: 'trial-radar',
    name: 'Trial Radar',
    description: 'Find clinical trials matching your diagnosis and biomarkers',
    icon: '🔬',
    href: '/trials',
    requiresAuth: false,
    requiresRecords: false,
  },
  {
    slug: 'combat',
    name: 'Cancer Combat',
    description: 'Get 5 AI oncologist perspectives on treatment decisions',
    icon: '⚔️',
    href: '/combat',
    requiresAuth: false,
    requiresRecords: false,
  },
  {
    slug: 'records',
    name: 'Records Translator',
    description: 'Upload medical records for AI-powered plain English translation',
    icon: '📋',
    href: '/records',
    requiresAuth: false,
    requiresRecords: false,
  },
  {
    slug: 'expert-review',
    name: 'Expert Review',
    description: 'Get your case reviewed by a human oncologist',
    icon: '👨‍⚕️',
    href: '/expert-review',
    requiresAuth: true,
    requiresRecords: true,
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle Guide',
    description: 'Evidence-based nutrition, exercise, and wellness recommendations',
    icon: '🥗',
    href: '/lifestyle',
    requiresAuth: false,
    requiresRecords: false,
  },
  {
    slug: 'services',
    name: 'Services Directory',
    description: 'Find cancer support services, financial aid, and resources',
    icon: '🏥',
    href: '/services',
    requiresAuth: false,
    requiresRecords: false,
  },
]

// Question intent categories
export type QuestionIntent =
  | 'trial_search'
  | 'treatment_comparison'
  | 'treatment_info'
  | 'symptom_management'
  | 'side_effects'
  | 'second_opinion'
  | 'records_help'
  | 'lifestyle'
  | 'financial_support'
  | 'general_info'
  | 'unknown'

// Intent detection patterns (Phase 1: keyword-based)
const INTENT_PATTERNS: Record<QuestionIntent, RegExp[]> = {
  trial_search: [
    /\b(clinical trial|trials?|study|studies|experimental|research study|enroll|eligib)/i,
    /\b(new treatment|cutting edge|latest therapy|investigational)/i,
  ],
  treatment_comparison: [
    /\b(which treatment|compare|versus|vs\.?|better option|should i choose)/i,
    /\b(treatment options?|therapy options?|what are my options)/i,
    /\b(pros and cons|advantages|disadvantages)/i,
  ],
  treatment_info: [
    /\b(what is|how does|tell me about|explain).{0,20}(treatment|therapy|chemo|radiation|surgery|immunotherapy)/i,
    /\b(how.{0,10}work|mechanism|what.{0,10}expect)/i,
  ],
  symptom_management: [
    /\b(manage|managing|cope|coping|deal with|help with).{0,15}(symptom|pain|nausea|fatigue)/i,
    /\b(symptom|side effect).{0,10}(relief|management|control)/i,
  ],
  side_effects: [
    /\b(side effect|adverse|toxicit|reaction)/i,
    /\b(nausea|fatigue|hair loss|neuropathy|diarrhea|constipation)/i,
  ],
  second_opinion: [
    /\b(second opinion|another doctor|review my case|expert.{0,10}review)/i,
    /\b(oncologist.{0,10}(think|review|look at))/i,
  ],
  records_help: [
    /\b(medical record|lab result|pathology|biopsy report|scan result)/i,
    /\b(understand my.{0,10}(report|results|records))/i,
    /\b(what does.{0,10}(report|result|test).{0,10}mean)/i,
  ],
  lifestyle: [
    /\b(diet|nutrition|exercise|fitness|wellness|sleep|stress)/i,
    /\b(eat|food|supplement|vitamin|lifestyle)/i,
    /\b(yoga|meditation|mindful)/i,
  ],
  financial_support: [
    /\b(financial|cost|afford|insurance|copay|assistance|aid)/i,
    /\b(pay for|coverage|help.{0,10}pay)/i,
  ],
  general_info: [
    /\b(what is|what are|tell me about|explain|overview)/i,
  ],
  unknown: [],
}

// Patient entity state derived from PCO
interface EntityState {
  hasDiagnosis: boolean
  hasCancerType: boolean
  hasBiomarkers: boolean
  hasRecords: boolean
  hasTreatments: boolean
  hasStage: boolean
  isAuthenticated: boolean
  cancerType: string | null
}

// Recommendation result
export interface ToolRecommendation {
  tool: Tool
  reason: string
  confidence: 'high' | 'medium' | 'low'
  context: {
    intent: QuestionIntent
    cancerType: string | null
    matchedOn: string[]
  }
}

/**
 * Classify question intent based on keyword patterns
 */
export function classifyIntent(question: string): QuestionIntent {
  const normalizedQuestion = question.toLowerCase().trim()

  // Check each intent pattern in priority order
  const intentPriority: QuestionIntent[] = [
    'trial_search',
    'treatment_comparison',
    'second_opinion',
    'records_help',
    'symptom_management',
    'side_effects',
    'lifestyle',
    'financial_support',
    'treatment_info',
    'general_info',
  ]

  for (const intent of intentPriority) {
    const patterns = INTENT_PATTERNS[intent]
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuestion)) {
        return intent
      }
    }
  }

  return 'unknown'
}

/**
 * Extract entity state from Patient Context Object
 */
export function getEntityState(
  pco: PatientContextObject | null,
  options: { isAuthenticated?: boolean; hasRecords?: boolean } = {}
): EntityState {
  const { isAuthenticated = false, hasRecords = false } = options

  if (!pco) {
    return {
      hasDiagnosis: false,
      hasCancerType: false,
      hasBiomarkers: false,
      hasRecords,
      hasTreatments: false,
      hasStage: false,
      isAuthenticated,
      cancerType: null,
    }
  }

  const cancerType = pco.diagnoses?.[0]?.cancer_type || null

  return {
    hasDiagnosis: (pco.diagnoses?.length || 0) > 0,
    hasCancerType: !!cancerType,
    hasBiomarkers: (pco.biomarkers?.length || 0) > 0,
    hasRecords,
    hasTreatments: (pco.treatments?.length || 0) > 0,
    hasStage: !!pco.diagnoses?.[0]?.stage,
    isAuthenticated,
    cancerType,
  }
}

/**
 * Intent × Entity Matching Matrix — THE RULESET
 *
 * ┌─────────────────────┬─────────────────────┬─────────────────────┬──────────────────────┐
 * │ Intent              │ Has Records         │ Has Cancer Type     │ Recommendation       │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ trial_search        │ —                   │ + biomarkers        │ Trial Radar          │
 * │ trial_search        │ —                   │ ✓                   │ Trial Radar          │
 * │ trial_search        │ —                   │ ✗                   │ Records (upload)     │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ treatment_comparison│ —                   │ any                 │ Combat               │
 * │ treatment_info      │ —                   │ ✓                   │ Combat               │
 * │ treatment_info      │ —                   │ ✗                   │ null                 │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ second_opinion      │ ✓ + auth            │ —                   │ Expert Review        │
 * │ second_opinion      │ ✗ + auth            │ —                   │ Records (upload)     │
 * │ second_opinion      │ ✗ + no auth         │ —                   │ Combat (fallback)    │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ records_help        │ —                   │ —                   │ Records              │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ symptom_management  │ —                   │ —                   │ Lifestyle            │
 * │ side_effects        │ —                   │ —                   │ Lifestyle            │
 * │ lifestyle           │ —                   │ —                   │ Lifestyle            │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ financial_support   │ —                   │ —                   │ Services             │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ general_info        │ ✓ + auth            │ —                   │ Expert Review        │
 * │ general_info        │ ✗                   │ ✓                   │ Combat               │
 * │ general_info        │ ✗                   │ ✗                   │ null                 │
 * ├─────────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
 * │ unknown             │ ✓ + auth            │ —                   │ Expert Review        │
 * │ unknown             │ ✗                   │ —                   │ null                 │
 * └─────────────────────┴─────────────────────┴─────────────────────┴──────────────────────┘
 *
 * Priority: hasRecords + auth → Expert Review (human review is highest value)
 */
function matchToolForIntent(
  intent: QuestionIntent,
  state: EntityState
): { slug: string; reason: string; matchedOn: string[] } | null {

  // PRIORITY RULE: If user has records + is authenticated, always offer Expert Review
  // (except for very specific intents like lifestyle, financial, records_help)
  const expertReviewIntents: QuestionIntent[] = [
    'trial_search', 'treatment_comparison', 'treatment_info',
    'second_opinion', 'general_info', 'unknown'
  ]
  if (state.hasRecords && state.isAuthenticated && expertReviewIntents.includes(intent)) {
    return {
      slug: 'expert-review',
      reason: state.cancerType
        ? `Get your ${state.cancerType} case reviewed by a human oncologist`
        : 'Get your case reviewed by a human oncologist',
      matchedOn: ['has:records', 'authenticated', `intent:${intent}`],
    }
  }

  switch (intent) {
    case 'trial_search':
      if (state.hasBiomarkers) {
        return {
          slug: 'trial-radar',
          reason: `Find trials matching your ${state.cancerType || 'cancer'} and biomarkers`,
          matchedOn: ['intent:trial_search', 'has:biomarkers'],
        }
      }
      if (state.hasCancerType) {
        return {
          slug: 'trial-radar',
          reason: `Find clinical trials for ${state.cancerType}`,
          matchedOn: ['intent:trial_search', 'has:cancer_type'],
        }
      }
      return {
        slug: 'records',
        reason: 'Upload your records to find matching clinical trials',
        matchedOn: ['intent:trial_search', 'missing:diagnosis'],
      }

    case 'treatment_comparison':
      if (state.hasBiomarkers) {
        return {
          slug: 'combat',
          reason: `Compare treatments with molecular-guided perspectives for ${state.cancerType || 'your cancer'}`,
          matchedOn: ['intent:treatment_comparison', 'has:biomarkers'],
        }
      }
      if (state.hasCancerType) {
        return {
          slug: 'combat',
          reason: `Get 5 oncologist perspectives on ${state.cancerType} treatment options`,
          matchedOn: ['intent:treatment_comparison', 'has:cancer_type'],
        }
      }
      return {
        slug: 'combat',
        reason: 'Get 5 AI oncologist perspectives on your treatment decision',
        matchedOn: ['intent:treatment_comparison'],
      }

    case 'second_opinion':
      // Already handled by priority rule if they have records
      if (state.isAuthenticated) {
        return {
          slug: 'records',
          reason: 'Upload your records to get an expert case review',
          matchedOn: ['intent:second_opinion', 'missing:records'],
        }
      }
      return {
        slug: 'combat',
        reason: 'Get multiple AI oncologist perspectives on your situation',
        matchedOn: ['intent:second_opinion', 'fallback:combat'],
      }

    case 'records_help':
      return {
        slug: 'records',
        reason: 'Upload records for AI-powered plain English translation',
        matchedOn: ['intent:records_help'],
      }

    case 'symptom_management':
    case 'side_effects':
      return {
        slug: 'lifestyle',
        reason: 'Evidence-based tips for managing symptoms and side effects',
        matchedOn: [`intent:${intent}`],
      }

    case 'lifestyle':
      return {
        slug: 'lifestyle',
        reason: state.cancerType
          ? `Personalized lifestyle guidance for ${state.cancerType}`
          : 'Evidence-based nutrition and wellness recommendations',
        matchedOn: ['intent:lifestyle'],
      }

    case 'financial_support':
      return {
        slug: 'services',
        reason: 'Find financial assistance programs and support services',
        matchedOn: ['intent:financial_support'],
      }

    case 'treatment_info':
      if (state.hasCancerType) {
        return {
          slug: 'combat',
          reason: `Get 5 oncologist perspectives on ${state.cancerType} treatment`,
          matchedOn: ['intent:treatment_info', 'has:cancer_type'],
        }
      }
      return null

    case 'general_info':
      if (state.hasCancerType) {
        return {
          slug: 'combat',
          reason: `Explore ${state.cancerType} with 5 AI oncologist perspectives`,
          matchedOn: ['intent:general_info', 'has:cancer_type'],
        }
      }
      return null

    case 'unknown':
    default:
      return null
  }
}

/**
 * Main recommendation function
 * Returns 0-1 tool recommendations based on question and patient context
 */
export function recommendTool(
  question: string,
  pco: PatientContextObject | null,
  options: {
    isAuthenticated?: boolean
    hasRecords?: boolean // User has uploaded medical records
    currentPage?: string // Don't recommend the tool they're already on
    recentlyDismissed?: string[] // Tools user has dismissed
  } = {}
): ToolRecommendation | null {
  const { isAuthenticated = false, hasRecords = false, currentPage, recentlyDismissed = [] } = options

  // Classify intent
  const intent = classifyIntent(question)

  // Get entity state
  const state = getEntityState(pco, { isAuthenticated, hasRecords })

  // Match tool
  const match = matchToolForIntent(intent, state)

  if (!match) {
    return null
  }

  // Find tool in catalog
  const tool = TOOL_CATALOG.find(t => t.slug === match.slug)
  if (!tool) {
    return null
  }

  // Filter: don't recommend current page
  if (currentPage && tool.href === currentPage) {
    return null
  }

  // Filter: don't recommend recently dismissed tools
  if (recentlyDismissed.includes(tool.slug)) {
    return null
  }

  // Filter: don't recommend tools requiring auth if not authenticated
  if (tool.requiresAuth && !isAuthenticated) {
    // Find fallback or return null
    return null
  }

  // Determine confidence based on how specific the match is
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  if (match.matchedOn.length >= 3) {
    confidence = 'high'
  } else if (match.matchedOn.includes('fallback') || intent === 'unknown') {
    confidence = 'low'
  }

  return {
    tool,
    reason: match.reason,
    confidence,
    context: {
      intent,
      cancerType: state.cancerType,
      matchedOn: match.matchedOn,
    },
  }
}

/**
 * Format recommendation for API response
 */
export function formatRecommendationForResponse(rec: ToolRecommendation | null): {
  hasRecommendation: boolean
  recommendation: {
    slug: string
    name: string
    description: string
    icon: string
    href: string
    reason: string
    confidence: string
  } | null
} {
  if (!rec) {
    return { hasRecommendation: false, recommendation: null }
  }

  return {
    hasRecommendation: true,
    recommendation: {
      slug: rec.tool.slug,
      name: rec.tool.name,
      description: rec.tool.description,
      icon: rec.tool.icon,
      href: rec.tool.href,
      reason: rec.reason,
      confidence: rec.confidence,
    },
  }
}

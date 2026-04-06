import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Disease state patterns to detect
const DISEASE_STATES = {
  mHSPC: /m?HSPC|hormone.?sensitive|castration.?sensitive/i,
  mCRPC: /m?CRPC|castration.?resistant|hormone.?refractory/i,
  BCR: /biochemical.?recur|BCR|rising.?PSA.?after/i,
  localized: /localized|stage.?[I1-3]|confined/i,
  oligometastatic: /oligomet|oligo.?recur|limited.?met/i,
  metastatic: /metasta|stage.?IV|spread/i,
}

// Evidence tier patterns
const EVIDENCE_TIERS = {
  guideline: /NCCN|guideline|standard.?of.?care|FDA.?approved|category.?1/i,
  phase3: /phase.?3|phase.?III|randomized.?control|RCT/i,
  phase2: /phase.?2|phase.?II|single.?arm/i,
  phase1: /phase.?1|phase.?I|dose.?escalation/i,
  preclinical: /preclinical|cell.?line|mouse|in.?vitro|mechanistic/i,
  anecdotal: /case.?report|anecdotal|n.?of.?1|personal.?experience/i,
}

// Treatment option patterns (to count distinct options)
const TREATMENT_PATTERNS = [
  /chemotherapy|chemo|docetaxel|cabazitaxel/i,
  /hormone|ADT|androgen.?deprivation|LHRH|lupron/i,
  /ARPI|ARSI|enzalutamide|abiraterone|darolutamide|apalutamide/i,
  /immunotherapy|checkpoint|pembrolizumab|keytruda/i,
  /radiation|SBRT|EBRT|brachytherapy/i,
  /surgery|prostatectomy|RARP/i,
  /PARP.?inhibitor|olaparib|rucaparib/i,
  /clinical.?trial/i,
  /active.?surveillance|watchful.?waiting/i,
  /BAT|bipolar|SPT|testosterone.?therapy/i,
  /vaccine|sipuleucel|provenge/i,
  /radiopharmaceutical|lutetium|PSMA|pluvicto/i,
]

// Analyze response for eval signals
function analyzeResponse(question: string, response: string): {
  diseaseStatesDetected: string[]
  evidenceTiersCited: string[]
  treatmentOptionsCount: number
  treatmentOptionsMentioned: string[]
  hasFalseDichotomy: boolean
  dichotomySignals: string[]
  confidenceSignals: {
    hedgingPhrases: number
    certaintyPhrases: number
    uncertaintyRatio: number
  }
  responseLength: number
  questionType: string
} {
  const combined = `${question} ${response}`

  // Detect disease states
  const diseaseStatesDetected: string[] = []
  for (const [state, pattern] of Object.entries(DISEASE_STATES)) {
    if (pattern.test(combined)) {
      diseaseStatesDetected.push(state)
    }
  }

  // Detect evidence tiers
  const evidenceTiersCited: string[] = []
  for (const [tier, pattern] of Object.entries(EVIDENCE_TIERS)) {
    if (pattern.test(response)) {
      evidenceTiersCited.push(tier)
    }
  }

  // Count treatment options
  const treatmentOptionsMentioned: string[] = []
  for (const pattern of TREATMENT_PATTERNS) {
    if (pattern.test(response)) {
      treatmentOptionsMentioned.push(pattern.source.split('|')[0].replace(/\\/g, ''))
    }
  }

  // Detect false dichotomy signals
  const dichotomySignals: string[] = []
  const dichotomyPatterns = [
    { pattern: /either.*or|only two options|two choices/i, signal: 'binary_framing' },
    { pattern: /conventional.*vs.*cutting.?edge|standard.*vs.*experimental/i, signal: 'conventional_vs_novel' },
    { pattern: /aggressive.*vs.*conservative/i, signal: 'aggressive_vs_conservative' },
    { pattern: /the only options are/i, signal: 'limiting_language' },
  ]
  for (const { pattern, signal } of dichotomyPatterns) {
    if (pattern.test(response)) {
      dichotomySignals.push(signal)
    }
  }
  const hasFalseDichotomy = dichotomySignals.length > 0 || treatmentOptionsMentioned.length <= 2

  // Confidence analysis
  const hedgingPhrases = (response.match(/may|might|could|possibly|potentially|consider|uncertain|unclear|limited.?evidence/gi) || []).length
  const certaintyPhrases = (response.match(/definitely|certainly|always|never|must|should|will|proven|established/gi) || []).length
  const uncertaintyRatio = hedgingPhrases / Math.max(1, hedgingPhrases + certaintyPhrases)

  // Question type classification
  let questionType = 'general'
  if (/treatment|therapy|option|recommend/i.test(question)) questionType = 'treatment'
  else if (/side.?effect|symptom|feel/i.test(question)) questionType = 'symptom'
  else if (/test|scan|biopsy|PSA|marker/i.test(question)) questionType = 'diagnostic'
  else if (/prognosis|survival|outcome|chance/i.test(question)) questionType = 'prognosis'
  else if (/trial|study|research/i.test(question)) questionType = 'trial'

  return {
    diseaseStatesDetected,
    evidenceTiersCited,
    treatmentOptionsCount: treatmentOptionsMentioned.length,
    treatmentOptionsMentioned,
    hasFalseDichotomy,
    dichotomySignals,
    confidenceSignals: {
      hedgingPhrases,
      certaintyPhrases,
      uncertaintyRatio,
    },
    responseLength: response.length,
    questionType,
  }
}

// Cost per 1M tokens (Haiku pricing as of 2024)
const TOKEN_COSTS = {
  'claude-3-5-haiku': { input: 0.25, output: 1.25 }, // per 1M tokens
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'default': { input: 0.25, output: 1.25 },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      question,
      response,
      userId,
      sessionId,
      cancerType,
      // Graph metrics
      hasPatientContext,
      patientContext,
      // RAG metrics
      confidenceScore,
      citationCount,
      sourceTypes,
      usedFallback,
      // LLM metrics
      latencyMs,
      model,
      inputTokens,
      outputTokens,
      // Feedback
      feedbackType,
      feedbackComment,
    } = body

    const supabase = getSupabase()

    // Analyze the response
    const analysis = analyzeResponse(question, response)

    // === GRAPH METRICS: Personalization detection ===
    let personalizationScore = 0
    const personalizationSignals: string[] = []

    if (patientContext && response) {
      const entityMatches = patientContext.match(/•\s*([^:]+):\s*([^\n•]+)/g) || []

      for (const match of entityMatches) {
        const valueMatch = match.match(/:\s*(.+)/)
        if (valueMatch) {
          const values = valueMatch[1].split(',').map((v: string) => v.trim().toLowerCase())

          for (const value of values) {
            const cleanValue = value.replace(/\[.*?\]|\(.*?\)/g, '').trim()
            if (cleanValue.length > 3 && response.toLowerCase().includes(cleanValue)) {
              personalizationScore++
              personalizationSignals.push(cleanValue.slice(0, 30))
            }
          }
        }
      }
    }

    // === LLM METRICS: Cost estimation ===
    const modelKey = model || 'default'
    const costs = TOKEN_COSTS[modelKey as keyof typeof TOKEN_COSTS] || TOKEN_COSTS.default
    const inputCost = ((inputTokens || 0) / 1_000_000) * costs.input
    const outputCost = ((outputTokens || 0) / 1_000_000) * costs.output
    const totalCostUsd = inputCost + outputCost

    // === COMPOSITE SCORES ===
    // LLM Score: Based on response quality signals (0-1)
    const uncertaintyRatio = analysis.confidenceSignals.uncertaintyRatio
    const llmScore = Math.min(1, Math.max(0,
      (1 - (analysis.hasFalseDichotomy ? 0.3 : 0)) + // Penalize false dichotomy
      (analysis.treatmentOptionsCount >= 3 ? 0.2 : analysis.treatmentOptionsCount >= 2 ? 0.1 : 0) + // Reward options
      (uncertaintyRatio >= 0.3 && uncertaintyRatio <= 0.7 ? 0.2 : 0) + // Balanced hedging
      (analysis.evidenceTiersCited.includes('guideline') ? 0.3 : analysis.evidenceTiersCited.length > 0 ? 0.15 : 0) // Evidence
    ))

    // RAG Score: Based on grounding quality (0-1)
    const ragScore = Math.min(1, Math.max(0,
      ((confidenceScore || 0) * 0.5) + // RAG confidence
      (Math.min((citationCount || 0), 5) / 5 * 0.3) + // Citation count (max 5)
      (usedFallback ? 0 : 0.2) // Penalty for fallback
    ))

    // Graph Score: Based on personalization (0-1)
    const graphScore = hasPatientContext
      ? Math.min(1, Math.max(0,
          0.3 + // Base score for having context
          (Math.min(personalizationScore, 5) / 5 * 0.7) // Personalization usage
        ))
      : 0

    // Combined Quality Score (weighted average)
    const qualityScore = (
      0.4 * llmScore +
      0.35 * ragScore +
      0.25 * graphScore
    )

    // Build eval log entry with all three dimensions
    const evalLog = {
      // === IDENTIFIERS ===
      user_id: userId || null,
      session_id: sessionId || null,

      // === INPUT ===
      question: question.slice(0, 1000),
      question_type: analysis.questionType,
      cancer_type: cancerType || null,

      // === LLM DIMENSION ===
      latency_ms: latencyMs || null,
      model: model || 'claude-3-5-haiku',
      input_tokens: inputTokens || null,
      output_tokens: outputTokens || null,
      total_tokens: (inputTokens || 0) + (outputTokens || 0),
      cost_usd: totalCostUsd > 0 ? totalCostUsd : null,
      response_length: analysis.responseLength,
      hedging_phrase_count: analysis.confidenceSignals.hedgingPhrases,
      certainty_phrase_count: analysis.confidenceSignals.certaintyPhrases,
      uncertainty_ratio: analysis.confidenceSignals.uncertaintyRatio,
      has_false_dichotomy: analysis.hasFalseDichotomy,
      dichotomy_signals: analysis.dichotomySignals,
      treatment_options_count: analysis.treatmentOptionsCount,
      treatment_options_mentioned: analysis.treatmentOptionsMentioned,
      llm_score: llmScore,

      // === RAG DIMENSION ===
      confidence_score: confidenceScore || null,
      citation_count: citationCount || 0,
      source_types: sourceTypes || [],
      used_fallback: usedFallback || false,
      disease_states_detected: analysis.diseaseStatesDetected,
      disease_state_count: analysis.diseaseStatesDetected.length,
      evidence_tiers_cited: analysis.evidenceTiersCited,
      highest_evidence_tier: analysis.evidenceTiersCited[0] || null,
      rag_score: ragScore,

      // === GRAPH DIMENSION ===
      has_patient_context: hasPatientContext || false,
      patient_context_length: patientContext?.length || 0,
      personalization_score: personalizationScore,
      personalization_signals: personalizationSignals.slice(0, 10),
      graph_score: graphScore,

      // === COMPOSITE SCORE ===
      quality_score: qualityScore,

      // === FEEDBACK ===
      feedback_type: feedbackType || null,
      feedback_comment: feedbackComment || null,

      // === FLAGS ===
      needs_expert_review: analysis.hasFalseDichotomy ||
        analysis.diseaseStatesDetected.length === 0 ||
        (analysis.evidenceTiersCited.includes('anecdotal') && !analysis.evidenceTiersCited.includes('guideline')) ||
        qualityScore < 0.4,

      // === TIMESTAMPS ===
      created_at: new Date().toISOString(),
    }

    // Store in Supabase
    const { error } = await supabase
      .from('navis_eval_logs')
      .insert(evalLog)

    if (error) {
      // Table might not exist yet - log to console and continue
      console.error('Eval log storage error (table may not exist):', error.message)
      console.log('Eval log data:', JSON.stringify(evalLog, null, 2))
    }

    return NextResponse.json({
      success: true,
      scores: {
        llm: llmScore,
        rag: ragScore,
        graph: graphScore,
        quality: qualityScore,
      },
      analysis: {
        diseaseStates: analysis.diseaseStatesDetected,
        evidenceTiers: analysis.evidenceTiersCited,
        treatmentOptions: analysis.treatmentOptionsCount,
        hasFalseDichotomy: analysis.hasFalseDichotomy,
        needsExpertReview: evalLog.needs_expert_review,
        latencyMs: latencyMs,
        costUsd: totalCostUsd,
        personalizationScore,
      }
    })

  } catch (err) {
    console.error('Eval logging error:', err)
    return NextResponse.json({ error: 'Failed to log eval' }, { status: 500 })
  }
}

// GET - Retrieve eval logs for analysis
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const needsReview = searchParams.get('needsReview') === 'true'
  const limitParam = searchParams.get('limit')
  // Default to 1000 to get all data, use 0 for truly unlimited
  const limit = limitParam ? parseInt(limitParam) : 1000

  const supabase = getSupabase()

  // First get total count
  const { count: totalCount } = await supabase
    .from('navis_eval_logs')
    .select('*', { count: 'exact', head: true })

  let query = supabase
    .from('navis_eval_logs')
    .select('*')
    .order('created_at', { ascending: false })

  // Only apply limit if > 0
  if (limit > 0) {
    query = query.limit(limit)
  }

  if (needsReview) {
    query = query.eq('needs_expert_review', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compute aggregate stats across all three dimensions
  const total = data?.length || 0
  const safeAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const stats = {
    total,
    needsReview: data?.filter(d => d.needs_expert_review).length || 0,

    // Legacy stats (for backwards compat)
    avgTreatmentOptions: safeAvg(data?.map(d => d.treatment_options_count || 0) || []),
    falseDichotomyRate: total > 0 ? (data?.filter(d => d.has_false_dichotomy).length || 0) / total : 0,
    avgUncertaintyRatio: safeAvg(data?.map(d => d.uncertainty_ratio || 0) || []),

    // === LLM DIMENSION STATS ===
    llm: {
      avgLatencyMs: safeAvg(data?.map(d => d.latency_ms || 0).filter(v => v > 0) || []),
      avgTokens: safeAvg(data?.map(d => d.total_tokens || 0).filter(v => v > 0) || []),
      totalCostUsd: data?.reduce((sum, d) => sum + (d.cost_usd || 0), 0) || 0,
      avgScore: safeAvg(data?.map(d => d.llm_score || 0).filter(v => v > 0) || []),
      falseDichotomyCount: data?.filter(d => d.has_false_dichotomy).length || 0,
    },

    // === RAG DIMENSION STATS ===
    rag: {
      avgConfidence: safeAvg(data?.map(d => d.confidence_score || 0).filter(v => v > 0) || []),
      avgCitations: safeAvg(data?.map(d => d.citation_count || 0) || []),
      fallbackRate: total > 0 ? (data?.filter(d => d.used_fallback).length || 0) / total : 0,
      avgScore: safeAvg(data?.map(d => d.rag_score || 0).filter(v => v > 0) || []),
      withGuidelinesCount: data?.filter(d => d.evidence_tiers_cited?.includes('guideline')).length || 0,
    },

    // === GRAPH DIMENSION STATS ===
    graph: {
      withContextCount: data?.filter(d => d.has_patient_context).length || 0,
      avgPersonalization: safeAvg(data?.map(d => d.personalization_score || 0) || []),
      highPersonalizationCount: data?.filter(d => (d.personalization_score || 0) >= 2).length || 0,
      avgScore: safeAvg(data?.map(d => d.graph_score || 0).filter(v => v > 0) || []),
      avgContextLength: safeAvg(data?.map(d => d.patient_context_length || 0).filter(v => v > 0) || []),
    },

    // === COMPOSITE STATS ===
    quality: {
      avgScore: safeAvg(data?.map(d => d.quality_score || 0).filter(v => v > 0) || []),
      highQualityCount: data?.filter(d => (d.quality_score || 0) >= 0.7).length || 0,
      lowQualityCount: data?.filter(d => (d.quality_score || 0) < 0.4 && (d.quality_score || 0) > 0).length || 0,
    },
  }

  return NextResponse.json({
    logs: data,
    stats,
    totalInDatabase: totalCount || 0,
    returnedCount: data?.length || 0,
  })
}

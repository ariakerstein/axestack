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

// GET - Retrieve eval logs for analysis (now pulls from ALL question sources)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const needsReview = searchParams.get('needsReview') === 'true'
  const limitParam = searchParams.get('limit')
  const sourceFilter = searchParams.get('source') // 'eval_log', 'activity', 'entity', or null for all
  // Default to 2000 to get all data
  const limit = limitParam ? parseInt(limitParam) : 2000

  const supabase = getSupabase()

  interface EvalLogRecord {
    id: string
    question: string
    question_type: string | null
    cancer_type: string | null
    created_at: string
    needs_expert_review: boolean
    feedback_type: string | null
    feedback_comment: string | null
    latency_ms: number | null
    model: string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
    cost_usd: number | null
    response_length: number
    hedging_phrase_count: number
    certainty_phrase_count: number
    uncertainty_ratio: number
    has_false_dichotomy: boolean
    dichotomy_signals: string[]
    treatment_options_count: number
    treatment_options_mentioned: string[]
    llm_score: number | null
    confidence_score: number | null
    citation_count: number | null
    source_types: string[] | null
    used_fallback: boolean
    disease_states_detected: string[]
    disease_state_count: number
    evidence_tiers_cited: string[]
    highest_evidence_tier: string | null
    rag_score: number | null
    has_patient_context: boolean
    patient_context_length: number
    personalization_score: number
    personalization_signals: string[]
    graph_score: number | null
    quality_score: number | null
    source?: 'eval_log' | 'activity' | 'entity' | 'patient_q' | 'combat'
    session_id?: string
    user_id?: string
  }

  const allLogs: EvalLogRecord[] = []

  // 1. Fetch from navis_eval_logs (rich eval data)
  if (!sourceFilter || sourceFilter === 'eval_log') {
    let evalQuery = supabase
      .from('navis_eval_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (needsReview) {
      evalQuery = evalQuery.eq('needs_expert_review', true)
    }

    const { data: evalData, error: evalError } = await evalQuery
    if (!evalError && evalData) {
      evalData.forEach((row: EvalLogRecord) => {
        allLogs.push({
          ...row,
          source: 'eval_log',
        })
      })
    }
  }

  // 2. Fetch from analytics_events (ask_question events)
  if (!sourceFilter || sourceFilter === 'activity') {
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_events')
      .select('id, event_timestamp, metadata, session_id, user_id')
      .eq('event_type', 'ask_question')
      .order('event_timestamp', { ascending: false })
      .limit(limit)

    if (!analyticsError && analyticsData) {
      analyticsData.forEach((row: { id: string; event_timestamp: string; metadata: Record<string, unknown>; session_id: string; user_id: string }) => {
        const metadata = row.metadata || {}
        const questionText = (metadata.question as string) || (metadata.query as string) || ''

        // Only add if not already in eval logs
        const alreadyExists = allLogs.some(log =>
          log.question?.toLowerCase() === questionText.toLowerCase() &&
          log.session_id === row.session_id
        )

        if (!alreadyExists && questionText) {
          allLogs.push({
            id: row.id,
            question: questionText,
            question_type: null,
            cancer_type: (metadata.cancer_type as string) || null,
            created_at: row.event_timestamp,
            needs_expert_review: false,
            feedback_type: null,
            feedback_comment: null,
            latency_ms: null,
            model: null,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            cost_usd: null,
            response_length: 0,
            hedging_phrase_count: 0,
            certainty_phrase_count: 0,
            uncertainty_ratio: 0,
            has_false_dichotomy: false,
            dichotomy_signals: [],
            treatment_options_count: 0,
            treatment_options_mentioned: [],
            llm_score: null,
            confidence_score: null,
            citation_count: null,
            source_types: null,
            used_fallback: false,
            disease_states_detected: [],
            disease_state_count: 0,
            evidence_tiers_cited: [],
            highest_evidence_tier: null,
            rag_score: null,
            has_patient_context: false,
            patient_context_length: 0,
            personalization_score: 0,
            personalization_signals: [],
            graph_score: null,
            quality_score: null,
            source: 'activity',
            session_id: row.session_id,
            user_id: row.user_id,
          })
        }
      })
    }
  }

  // 3. Fetch from patient_questions (circle-app questions)
  if (!sourceFilter || sourceFilter === 'patient_q') {
    const { data: patientQData, error: patientQError } = await supabase
      .from('patient_questions')
      .select('id, created_at, title, description, cancer_type, question_category, user_id, eval_score')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!patientQError && patientQData) {
      patientQData.forEach((row: { id: string; created_at: string; title: string; description: string; cancer_type: string; question_category: string; user_id: string; eval_score: number | null }) => {
        // Combine title and description for the question text
        const questionText = row.title || row.description || ''

        // Only add if not already found
        const alreadyExists = allLogs.some(log =>
          log.question?.toLowerCase() === questionText.toLowerCase()
        )

        if (!alreadyExists && questionText) {
          allLogs.push({
            id: row.id,
            question: questionText,
            question_type: row.question_category || null,
            cancer_type: row.cancer_type || null,
            created_at: row.created_at,
            needs_expert_review: false,
            feedback_type: null,
            feedback_comment: null,
            latency_ms: null,
            model: null,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            cost_usd: null,
            response_length: 0,
            hedging_phrase_count: 0,
            certainty_phrase_count: 0,
            uncertainty_ratio: 0,
            has_false_dichotomy: false,
            dichotomy_signals: [],
            treatment_options_count: 0,
            treatment_options_mentioned: [],
            llm_score: null,
            confidence_score: null,
            citation_count: null,
            source_types: null,
            used_fallback: false,
            disease_states_detected: [],
            disease_state_count: 0,
            evidence_tiers_cited: [],
            highest_evidence_tier: null,
            rag_score: null,
            has_patient_context: false,
            patient_context_length: 0,
            personalization_score: 0,
            personalization_signals: [],
            graph_score: row.eval_score || null,
            quality_score: row.eval_score ? row.eval_score / 100 : null,
            source: 'patient_q',
            session_id: undefined,
            user_id: row.user_id,
          })
        }
      })
    }
  }

  // 4. Fetch from combat_analyses (Combat questions)
  if (!sourceFilter || sourceFilter === 'combat') {
    const { data: combatData, error: combatError } = await supabase
      .from('combat_analyses')
      .select('id, created_at, question, phase, user_id, session_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!combatError && combatData) {
      combatData.forEach((row: { id: string; created_at: string; question: string; phase: string; user_id: string; session_id: string }) => {
        const questionText = row.question || ''

        // Only add if not already found
        const alreadyExists = allLogs.some(log =>
          log.question?.toLowerCase() === questionText.toLowerCase()
        )

        if (!alreadyExists && questionText) {
          allLogs.push({
            id: row.id,
            question: questionText,
            question_type: row.phase || 'combat',
            cancer_type: null,
            created_at: row.created_at,
            needs_expert_review: false,
            feedback_type: null,
            feedback_comment: null,
            latency_ms: null,
            model: null,
            input_tokens: null,
            output_tokens: null,
            total_tokens: null,
            cost_usd: null,
            response_length: 0,
            hedging_phrase_count: 0,
            certainty_phrase_count: 0,
            uncertainty_ratio: 0,
            has_false_dichotomy: false,
            dichotomy_signals: [],
            treatment_options_count: 0,
            treatment_options_mentioned: [],
            llm_score: null,
            confidence_score: null,
            citation_count: null,
            source_types: null,
            used_fallback: false,
            disease_states_detected: [],
            disease_state_count: 0,
            evidence_tiers_cited: [],
            highest_evidence_tier: null,
            rag_score: null,
            has_patient_context: false,
            patient_context_length: 0,
            personalization_score: 0,
            personalization_signals: [],
            graph_score: null,
            quality_score: null,
            source: 'combat',
            session_id: row.session_id,
            user_id: row.user_id,
          })
        }
      })
    }
  }

  // Sort all by created_at descending
  allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply limit
  const limitedLogs = allLogs.slice(0, limit)

  // Get counts by source
  const evalLogCount = allLogs.filter(l => l.source === 'eval_log').length
  const activityCount = allLogs.filter(l => l.source === 'activity').length
  const patientQCount = allLogs.filter(l => l.source === 'patient_q').length
  const combatCount = allLogs.filter(l => l.source === 'combat').length

  // Compute aggregate stats across all three dimensions
  const total = limitedLogs.length
  const safeAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const stats = {
    total,
    needsReview: limitedLogs.filter(d => d.needs_expert_review).length,

    // Source breakdown
    bySource: {
      eval_log: evalLogCount,
      activity: activityCount,
      patient_q: patientQCount,
      combat: combatCount,
    },

    // Legacy stats (for backwards compat)
    avgTreatmentOptions: safeAvg(limitedLogs.map(d => d.treatment_options_count || 0)),
    falseDichotomyRate: total > 0 ? limitedLogs.filter(d => d.has_false_dichotomy).length / total : 0,
    avgUncertaintyRatio: safeAvg(limitedLogs.map(d => d.uncertainty_ratio || 0)),

    // === LLM DIMENSION STATS ===
    llm: {
      avgLatencyMs: safeAvg(limitedLogs.map(d => d.latency_ms || 0).filter(v => v > 0)),
      avgTokens: safeAvg(limitedLogs.map(d => d.total_tokens || 0).filter(v => v > 0)),
      totalCostUsd: limitedLogs.reduce((sum, d) => sum + (d.cost_usd || 0), 0),
      avgScore: safeAvg(limitedLogs.map(d => d.llm_score || 0).filter(v => v > 0)),
      falseDichotomyCount: limitedLogs.filter(d => d.has_false_dichotomy).length,
    },

    // === RAG DIMENSION STATS ===
    rag: {
      avgConfidence: safeAvg(limitedLogs.map(d => d.confidence_score || 0).filter(v => v > 0)),
      avgCitations: safeAvg(limitedLogs.map(d => d.citation_count || 0)),
      fallbackRate: total > 0 ? limitedLogs.filter(d => d.used_fallback).length / total : 0,
      avgScore: safeAvg(limitedLogs.map(d => d.rag_score || 0).filter(v => v > 0)),
      withGuidelinesCount: limitedLogs.filter(d => d.evidence_tiers_cited?.includes('guideline')).length,
    },

    // === GRAPH DIMENSION STATS ===
    graph: {
      withContextCount: limitedLogs.filter(d => d.has_patient_context).length,
      avgPersonalization: safeAvg(limitedLogs.map(d => d.personalization_score || 0)),
      highPersonalizationCount: limitedLogs.filter(d => (d.personalization_score || 0) >= 2).length,
      avgScore: safeAvg(limitedLogs.map(d => d.graph_score || 0).filter(v => v > 0)),
      avgContextLength: safeAvg(limitedLogs.map(d => d.patient_context_length || 0).filter(v => v > 0)),
    },

    // === COMPOSITE STATS ===
    quality: {
      avgScore: safeAvg(limitedLogs.map(d => d.quality_score || 0).filter(v => v > 0)),
      highQualityCount: limitedLogs.filter(d => (d.quality_score || 0) >= 0.7).length,
      lowQualityCount: limitedLogs.filter(d => (d.quality_score || 0) < 0.4 && (d.quality_score || 0) > 0).length,
    },
  }

  return NextResponse.json({
    logs: limitedLogs,
    stats,
    totalInDatabase: allLogs.length,
    returnedCount: limitedLogs.length,
  })
}

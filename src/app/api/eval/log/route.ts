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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      question,
      response,
      userId,
      sessionId,
      cancerType,
      hasPatientContext,
      confidenceScore,
      usedFallback,
      feedbackType, // optional: 'positive' | 'negative'
      feedbackComment, // optional
    } = body

    const supabase = getSupabase()

    // Analyze the response
    const analysis = analyzeResponse(question, response)

    // Build eval log entry
    const evalLog = {
      // Identifiers
      user_id: userId || null,
      session_id: sessionId || null,

      // Input
      question: question.slice(0, 1000), // Truncate long questions
      question_type: analysis.questionType,
      cancer_type: cancerType || null,

      // Context
      has_patient_context: hasPatientContext || false,

      // Response metadata
      response_length: analysis.responseLength,
      confidence_score: confidenceScore || null,
      used_fallback: usedFallback || false,

      // Disease state analysis
      disease_states_detected: analysis.diseaseStatesDetected,
      disease_state_count: analysis.diseaseStatesDetected.length,

      // Evidence analysis
      evidence_tiers_cited: analysis.evidenceTiersCited,
      highest_evidence_tier: analysis.evidenceTiersCited[0] || null,

      // Treatment options analysis
      treatment_options_count: analysis.treatmentOptionsCount,
      treatment_options_mentioned: analysis.treatmentOptionsMentioned,

      // False dichotomy detection
      has_false_dichotomy: analysis.hasFalseDichotomy,
      dichotomy_signals: analysis.dichotomySignals,

      // Confidence/hedging analysis
      hedging_phrase_count: analysis.confidenceSignals.hedgingPhrases,
      certainty_phrase_count: analysis.confidenceSignals.certaintyPhrases,
      uncertainty_ratio: analysis.confidenceSignals.uncertaintyRatio,

      // Feedback (if provided)
      feedback_type: feedbackType || null,
      feedback_comment: feedbackComment || null,

      // For expert review queue
      needs_expert_review: analysis.hasFalseDichotomy ||
        analysis.diseaseStatesDetected.length === 0 ||
        (analysis.evidenceTiersCited.includes('anecdotal') && !analysis.evidenceTiersCited.includes('guideline')),

      // Timestamps
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
      analysis: {
        diseaseStates: analysis.diseaseStatesDetected,
        evidenceTiers: analysis.evidenceTiersCited,
        treatmentOptions: analysis.treatmentOptionsCount,
        hasFalseDichotomy: analysis.hasFalseDichotomy,
        needsExpertReview: evalLog.needs_expert_review,
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
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = getSupabase()

  let query = supabase
    .from('navis_eval_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (needsReview) {
    query = query.eq('needs_expert_review', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compute aggregate stats
  const stats = {
    total: data?.length || 0,
    needsReview: data?.filter(d => d.needs_expert_review).length || 0,
    avgTreatmentOptions: data?.reduce((sum, d) => sum + (d.treatment_options_count || 0), 0) / (data?.length || 1),
    falseDichotomyRate: data?.filter(d => d.has_false_dichotomy).length / (data?.length || 1),
    avgUncertaintyRatio: data?.reduce((sum, d) => sum + (d.uncertainty_ratio || 0), 0) / (data?.length || 1),
    byQuestionType: {},
    byDiseaseState: {},
  }

  return NextResponse.json({ logs: data, stats })
}

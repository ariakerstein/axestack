import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ADMIN_KEY = process.env.ADMIN_KEY || ''

interface QuestionRecord {
  id: string
  created_at: string
  question: string
  question_type: string | null
  cancer_type: string | null
  confidence_score: number | null
  feedback_type: string | null
  feedback_comment: string | null
  has_patient_context: boolean | null
  used_fallback: boolean | null
  treatment_options_count: number | null
  has_false_dichotomy: boolean | null
  needs_expert_review: boolean | null
  session_id: string | null
  user_id: string | null
  source: 'eval_log' | 'activity' | 'entity' | 'circle'
  // Rich eval data (only from navis_eval_logs)
  llm_score?: number | null
  rag_score?: number | null
  graph_score?: number | null
  quality_score?: number | null
}

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '500')
  const cancerType = searchParams.get('cancerType')
  const needsReview = searchParams.get('needsReview') === 'true'
  const hasFeedback = searchParams.get('hasFeedback') === 'true'
  const source = searchParams.get('source') // 'eval_log', 'activity', 'entity', or null for all
  const days = parseInt(searchParams.get('days') || '0') // 0 = all time

  // Calculate date filter
  let dateFilter: string | null = null
  if (days > 0) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    dateFilter = cutoffDate.toISOString()
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const allQuestions: QuestionRecord[] = []

  // 1. Fetch from navis_eval_logs (rich eval data)
  if (!source || source === 'eval_log') {
    let evalQuery = supabase
      .from('navis_eval_logs')
      .select(`
        id,
        created_at,
        question,
        question_type,
        cancer_type,
        confidence_score,
        feedback_type,
        feedback_comment,
        has_patient_context,
        used_fallback,
        treatment_options_count,
        has_false_dichotomy,
        needs_expert_review,
        session_id,
        user_id,
        llm_score,
        rag_score,
        graph_score,
        quality_score
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cancerType) {
      evalQuery = evalQuery.eq('cancer_type', cancerType)
    }
    if (needsReview) {
      evalQuery = evalQuery.eq('needs_expert_review', true)
    }
    if (hasFeedback) {
      evalQuery = evalQuery.not('feedback_type', 'is', null)
    }
    if (dateFilter) {
      evalQuery = evalQuery.gte('created_at', dateFilter)
    }

    const { data: evalData, error: evalError } = await evalQuery
    if (!evalError && evalData) {
      evalData.forEach(row => {
        allQuestions.push({
          ...row,
          source: 'eval_log',
        })
      })
    }
  }

  // 2. Fetch from patient_activity (ask_question) - main source of questions
  if (!source || source === 'activity') {
    let activityQuery = supabase
      .from('patient_activity')
      .select('id, created_at, metadata, session_id, user_id, cancer_type')
      .eq('activity_type', 'ask_question')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dateFilter) {
      activityQuery = activityQuery.gte('created_at', dateFilter)
    }

    const { data: patientActivityData, error: paError } = await activityQuery

    if (!paError && patientActivityData) {
      patientActivityData.forEach(row => {
        const metadata = row.metadata || {}
        // Question text is in metadata.title for patient_activity
        const questionText = metadata.title || metadata.question || ''
        const alreadyExists = allQuestions.some(q =>
          q.question?.toLowerCase() === questionText.toLowerCase()
        )
        if (!alreadyExists && questionText) {
          allQuestions.push({
            id: row.id,
            created_at: row.created_at,
            question: questionText,
            question_type: metadata.category || null,
            cancer_type: row.cancer_type || null,
            confidence_score: null,
            feedback_type: null,
            feedback_comment: null,
            has_patient_context: false,
            used_fallback: null,
            treatment_options_count: null,
            has_false_dichotomy: null,
            needs_expert_review: null,
            session_id: row.session_id,
            user_id: row.user_id,
            source: 'activity',
          })
        }
      })
    }

    // Also check analytics_events for any additional questions
    let analyticsQuery = supabase
      .from('analytics_events')
      .select('id, event_timestamp, metadata, session_id, user_id')
      .eq('event_type', 'ask_question')
      .order('event_timestamp', { ascending: false })
      .limit(limit)

    if (dateFilter) {
      analyticsQuery = analyticsQuery.gte('event_timestamp', dateFilter)
    }

    const { data: analyticsData, error: analyticsError } = await analyticsQuery

    if (!analyticsError && analyticsData) {
      analyticsData.forEach(row => {
        const metadata = row.metadata || {}
        const questionText = metadata.question || metadata.query || ''
        const alreadyExists = allQuestions.some(q =>
          q.question?.toLowerCase() === questionText.toLowerCase()
        )
        if (!alreadyExists && questionText) {
          allQuestions.push({
            id: row.id,
            created_at: row.event_timestamp,
            question: questionText,
            question_type: null,
            cancer_type: metadata.cancer_type || null,
            confidence_score: null,
            feedback_type: null,
            feedback_comment: null,
            has_patient_context: false,
            used_fallback: null,
            treatment_options_count: null,
            has_false_dichotomy: null,
            needs_expert_review: null,
            session_id: row.session_id,
            user_id: row.user_id,
            source: 'activity',
          })
        }
      })
    }
  }

  // 3. Fetch from patient_entities (entity_type = 'question')
  if (!source || source === 'entity') {
    let entityQuery = supabase
      .from('patient_entities')
      .select('id, created_at, entity_value, session_id, user_id')
      .eq('entity_type', 'question')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dateFilter) {
      entityQuery = entityQuery.gte('created_at', dateFilter)
    }

    const { data: entityData, error: entityError } = await entityQuery

    if (!entityError && entityData) {
      entityData.forEach(row => {
        const questionText = row.entity_value || ''
        // Only add if not already found
        const alreadyExists = allQuestions.some(q =>
          q.question?.toLowerCase() === questionText.toLowerCase() &&
          q.session_id === row.session_id
        )
        if (!alreadyExists && questionText) {
          allQuestions.push({
            id: row.id,
            created_at: row.created_at,
            question: questionText,
            question_type: null,
            cancer_type: null,
            confidence_score: null,
            feedback_type: null,
            feedback_comment: null,
            has_patient_context: null,
            used_fallback: null,
            treatment_options_count: null,
            has_false_dichotomy: null,
            needs_expert_review: null,
            session_id: row.session_id,
            user_id: row.user_id,
            source: 'entity',
          })
        }
      })
    }
  }

  // 4. Fetch from response_evaluations (Circle questions - largest source: 3,648+ questions)
  if (!source || source === 'circle') {
    let circleQuery = supabase
      .from('response_evaluations')
      .select(`
        id,
        created_at,
        question,
        cancer_type,
        overall_confidence,
        confidence_level,
        accuracy_score,
        completeness_score,
        question_fit_score,
        source_support_score,
        trustworthiness_score,
        communication_score,
        source,
        user_id,
        model_used
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cancerType) {
      circleQuery = circleQuery.eq('cancer_type', cancerType)
    }
    if (dateFilter) {
      circleQuery = circleQuery.gte('created_at', dateFilter)
    }

    const { data: circleData, error: circleError } = await circleQuery

    if (!circleError && circleData) {
      circleData.forEach(row => {
        const questionText = row.question || ''
        // Only add if not already found (avoid duplicates)
        const alreadyExists = allQuestions.some(q =>
          q.question?.toLowerCase() === questionText.toLowerCase()
        )
        if (!alreadyExists && questionText) {
          allQuestions.push({
            id: row.id,
            created_at: row.created_at,
            question: questionText,
            question_type: null,
            cancer_type: row.cancer_type,
            confidence_score: row.overall_confidence,
            feedback_type: null,
            feedback_comment: null,
            has_patient_context: null,
            used_fallback: null,
            treatment_options_count: null,
            has_false_dichotomy: null,
            needs_expert_review: null,
            session_id: null,
            user_id: row.user_id,
            source: 'circle',
            // Map Circle scores to eval log format
            llm_score: row.accuracy_score,
            rag_score: row.source_support_score,
            graph_score: null,
            quality_score: row.overall_confidence,
          })
        }
      })
    }
  }

  // Sort all by created_at descending
  allQuestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply limit
  const limitedQuestions = allQuestions.slice(0, limit)

  // Compute stats
  const stats = {
    total: limitedQuestions.length,
    totalEvalLogs: limitedQuestions.filter(q => q.source === 'eval_log').length,
    totalActivity: limitedQuestions.filter(q => q.source === 'activity').length,
    totalEntity: limitedQuestions.filter(q => q.source === 'entity').length,
    totalCircle: limitedQuestions.filter(q => q.source === 'circle').length,
    byCancerType: {} as Record<string, number>,
    byQuestionType: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    avgConfidence: 0,
    avgQualityScore: 0,
    feedbackBreakdown: {
      positive: 0,
      negative: 0,
      none: 0,
    },
    needsReviewCount: 0,
  }

  let confidenceSum = 0
  let confidenceCount = 0
  let qualitySum = 0
  let qualityCount = 0

  for (const row of limitedQuestions) {
    // Cancer type
    const ct = row.cancer_type || 'Unknown'
    stats.byCancerType[ct] = (stats.byCancerType[ct] || 0) + 1

    // Question type
    const qt = row.question_type || 'general'
    stats.byQuestionType[qt] = (stats.byQuestionType[qt] || 0) + 1

    // Source
    stats.bySource[row.source] = (stats.bySource[row.source] || 0) + 1

    // Confidence
    if (row.confidence_score) {
      confidenceSum += parseFloat(String(row.confidence_score))
      confidenceCount++
    }

    // Quality score
    if (row.quality_score) {
      qualitySum += row.quality_score
      qualityCount++
    }

    // Feedback
    if (row.feedback_type === 'positive') stats.feedbackBreakdown.positive++
    else if (row.feedback_type === 'negative') stats.feedbackBreakdown.negative++
    else stats.feedbackBreakdown.none++

    // Needs review
    if (row.needs_expert_review) stats.needsReviewCount++
  }

  stats.avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0
  stats.avgQualityScore = qualityCount > 0 ? qualitySum / qualityCount : 0

  return NextResponse.json({
    questions: limitedQuestions,
    stats,
  })
}

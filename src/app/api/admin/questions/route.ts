import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const ADMIN_KEY = process.env.ADMIN_KEY || 'opencancer-admin-2024'

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const cancerType = searchParams.get('cancerType')
  const needsReview = searchParams.get('needsReview') === 'true'
  const hasFeedback = searchParams.get('hasFeedback') === 'true'

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let query = supabase
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
      user_id
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cancerType) {
    query = query.eq('cancer_type', cancerType)
  }
  if (needsReview) {
    query = query.eq('needs_expert_review', true)
  }
  if (hasFeedback) {
    query = query.not('feedback_type', 'is', null)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compute stats
  const stats = {
    total: data?.length || 0,
    byCancerType: {} as Record<string, number>,
    byQuestionType: {} as Record<string, number>,
    avgConfidence: 0,
    feedbackBreakdown: {
      positive: 0,
      negative: 0,
      none: 0,
    },
    needsReviewCount: 0,
  }

  let confidenceSum = 0
  let confidenceCount = 0

  for (const row of data || []) {
    // Cancer type
    const ct = row.cancer_type || 'Unknown'
    stats.byCancerType[ct] = (stats.byCancerType[ct] || 0) + 1

    // Question type
    const qt = row.question_type || 'general'
    stats.byQuestionType[qt] = (stats.byQuestionType[qt] || 0) + 1

    // Confidence
    if (row.confidence_score) {
      confidenceSum += parseFloat(row.confidence_score)
      confidenceCount++
    }

    // Feedback
    if (row.feedback_type === 'positive') stats.feedbackBreakdown.positive++
    else if (row.feedback_type === 'negative') stats.feedbackBreakdown.negative++
    else stats.feedbackBreakdown.none++

    // Needs review
    if (row.needs_expert_review) stats.needsReviewCount++
  }

  stats.avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0

  return NextResponse.json({
    questions: data,
    stats,
  })
}

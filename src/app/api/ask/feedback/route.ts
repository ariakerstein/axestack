import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      question,
      feedbackType,
      feedbackComment,
      source, // 'ask' | 'circle-app' | 'combat'
      messageContent, // First 500 chars of the response for context
    } = body

    if (!sessionId || !feedbackType) {
      return NextResponse.json({ error: 'Missing sessionId or feedbackType' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Try to find and update existing eval log by session + question
    if (question) {
      const { data: existing, error: findError } = await supabase
        .from('navis_eval_logs')
        .select('id')
        .eq('session_id', sessionId)
        .ilike('question', question.slice(0, 100) + '%') // Match by question prefix
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!findError && existing) {
        // Update existing eval log
        const { error: updateError } = await supabase
          .from('navis_eval_logs')
          .update({
            feedback_type: feedbackType,
            feedback_comment: feedbackComment || null,
          })
          .eq('id', existing.id)

        if (!updateError) {
          console.log(`[Feedback] Updated eval log ${existing.id} with ${feedbackType} feedback`)
          return NextResponse.json({ success: true, updated: true, evalLogId: existing.id })
        }
      }
    }

    // No existing eval log found - create a new feedback-only entry
    // This handles cases where eval logging failed or was skipped
    const { data: newLog, error: insertError } = await supabase
      .from('navis_eval_logs')
      .insert({
        session_id: sessionId,
        question: question?.slice(0, 1000) || 'Unknown question',
        feedback_type: feedbackType,
        feedback_comment: feedbackComment || null,
        // Minimal metadata
        question_type: 'feedback_only',
        response_length: messageContent?.length || 0,
        // Zero out scores since we don't have the full analysis
        llm_score: null,
        rag_score: null,
        graph_score: null,
        quality_score: null,
        // Flag for review
        needs_expert_review: feedbackType === 'negative',
        // Track source
        disease_states_detected: [],
        evidence_tiers_cited: [],
        dichotomy_signals: [],
        treatment_options_mentioned: [],
        personalization_signals: [],
        source_types: [source || 'unknown'],
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Feedback] Insert error:', insertError)
      // Don't fail - feedback was still recorded in tracking
      return NextResponse.json({ success: true, fallback: true })
    }

    console.log(`[Feedback] Created new eval log ${newLog?.id} with ${feedbackType} feedback`)
    return NextResponse.json({ success: true, created: true, evalLogId: newLog?.id })

  } catch (err) {
    console.error('[Feedback] Error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}

// GET - Retrieve feedback for a session (for admin review)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const feedbackType = searchParams.get('type') // 'positive', 'negative', or null for all
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = getSupabase()

  let query = supabase
    .from('navis_eval_logs')
    .select('id, created_at, session_id, question, feedback_type, feedback_comment, quality_score, needs_expert_review')
    .not('feedback_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  if (feedbackType) {
    query = query.eq('feedback_type', feedbackType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Feedback] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }

  // Compute stats
  const stats = {
    total: data?.length || 0,
    positive: data?.filter(d => d.feedback_type === 'positive').length || 0,
    negative: data?.filter(d => d.feedback_type === 'negative').length || 0,
    withComments: data?.filter(d => d.feedback_comment).length || 0,
  }

  return NextResponse.json({ feedback: data, stats })
}

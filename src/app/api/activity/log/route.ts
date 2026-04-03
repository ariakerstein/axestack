import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Activity types and their categories
const ACTIVITY_CATEGORIES: Record<string, string> = {
  // Clinical
  record_upload: 'clinical',
  combat_run: 'clinical',
  combat_view: 'clinical',
  entity_extracted: 'clinical',

  // Discovery
  trial_search: 'discovery',
  trial_view: 'discovery',
  trial_save: 'discovery',
  trial_contact: 'discovery',
  oncologist_search: 'discovery',
  oncologist_view: 'discovery',
  research_query: 'discovery',
  ask_question: 'discovery',

  // Financial
  coverage_search: 'financial',
  coverage_view: 'financial',
  coverage_apply: 'financial',

  // Relationship
  caregiver_invite: 'relationship',
  caregiver_accept: 'relationship',
  share_record: 'relationship',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      activityType,
      userId,
      sessionId,
      cancerType,
      sourcePage,
      durationMs,
      metadata = {},
    } = body

    if (!activityType) {
      return NextResponse.json({ error: 'activityType required' }, { status: 400 })
    }

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'userId or sessionId required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const activity = {
      user_id: userId || null,
      session_id: sessionId || null,
      activity_type: activityType,
      activity_category: ACTIVITY_CATEGORIES[activityType] || 'other',
      cancer_type: cancerType || null,
      source_page: sourcePage || null,
      duration_ms: durationMs || null,
      metadata,
    }

    const { error } = await supabase
      .from('patient_activity')
      .insert(activity)

    if (error) {
      // Table might not exist yet - log and continue
      console.error('Activity log error (table may not exist):', error.message)
      console.log('Activity data:', JSON.stringify(activity, null, 2))
      // Don't fail the request - activity logging should be non-blocking
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Activity logging error:', err)
    // Don't fail - activity logging should never break the user flow
    return NextResponse.json({ success: false, error: 'logging failed' })
  }
}

// GET - Retrieve activity for admin/analysis
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const sessionId = searchParams.get('sessionId')
  const activityType = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = getSupabase()

  let query = supabase
    .from('patient_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) {
    query = query.eq('user_id', userId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  if (activityType) {
    query = query.eq('activity_type', activityType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activities: data })
}

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
  hub_update: 'relationship',

  // Outcomes
  combat_outcome: 'outcome',
}

// Actions that should become graph nodes (high-value for inference)
const GRAPH_WORTHY_ACTIONS = new Set([
  'record_upload',
  'combat_run',
  'trial_search',
  'trial_view',
  'trial_save',
  'trial_contact',
  'oncologist_search',
  'oncologist_view',
  'coverage_search',
  'coverage_apply',
  'ask_question',
  'caregiver_invite',  // Creates Patient → invited → Caregiver relationship
  'caregiver_accept',  // Creates Patient → connected_to → Caregiver relationship
  'share_record',
  'hub_update',        // Patient journey updates (valuable for longitudinal analysis)
  'combat_outcome',    // Self-reported outcomes (the start of your outcomes layer)
])

// Journey stages - the variable that makes data 10x more valuable
type JourneyStage = 'newly_diagnosed' | 'in_treatment' | 'post_treatment' | 'recurrence' | 'unknown'

// Infer journey stage from patient's entities and recent actions
async function inferJourneyStage(
  supabase: ReturnType<typeof getSupabase>,
  userId: string | null,
  sessionId: string | null
): Promise<JourneyStage> {
  if (!userId && !sessionId) return 'unknown'

  try {
    // Check for explicit stage in profile entities
    let query = supabase
      .from('patient_entities')
      .select('entity_type, entity_value, entity_status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: entities } = await query

    if (!entities || entities.length === 0) return 'newly_diagnosed' // First-time user

    // Look for treatment-related entities
    const hasTreatment = entities.some(e =>
      e.entity_type === 'treatment' ||
      (e.entity_type === 'action' && e.entity_value === 'combat_run' && e.entity_status === 'treatment')
    )

    // Look for recurrence indicators
    const hasRecurrence = entities.some(e =>
      e.entity_value?.toLowerCase().includes('recurrence') ||
      e.entity_value?.toLowerCase().includes('progression') ||
      e.entity_value?.toLowerCase().includes('metastatic')
    )

    // Look for completion indicators
    const hasCompletion = entities.some(e =>
      e.entity_value?.toLowerCase().includes('complete response') ||
      e.entity_value?.toLowerCase().includes('remission') ||
      e.entity_value?.toLowerCase().includes('ned') // No evidence of disease
    )

    // Inference logic
    if (hasRecurrence) return 'recurrence'
    if (hasCompletion) return 'post_treatment'
    if (hasTreatment) return 'in_treatment'

    // Check how long since first entity (rough proxy for journey stage)
    const firstEntityDate = new Date(entities[entities.length - 1].created_at)
    const daysSinceFirst = (Date.now() - firstEntityDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceFirst < 30) return 'newly_diagnosed'
    if (daysSinceFirst < 180) return 'in_treatment' // Assume treatment phase
    return 'post_treatment' // Long-term user

  } catch (err) {
    console.error('Journey stage inference error:', err)
    return 'unknown'
  }
}

// Create a graph node for this action (enables multi-hop queries)
async function createActionNode(
  supabase: ReturnType<typeof getSupabase>,
  activityId: string,
  activityType: string,
  userId: string | null,
  sessionId: string | null,
  cancerType: string | null,
  journeyStage: JourneyStage,
  metadata: Record<string, unknown>,
  previousActionId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('patient_entities')
      .insert({
        user_id: userId,
        session_id: sessionId,
        entity_type: 'action',
        entity_value: activityType,
        entity_status: journeyStage, // The key insight: action + journey stage
        confidence: 1.0,
        source_type: ACTIVITY_CATEGORIES[activityType] || 'other',
        metadata: {
          activity_id: activityId,
          cancer_type: cancerType,
          previous_action_id: previousActionId, // For behavioral chains
          journey_stage: journeyStage,
          ...metadata,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('Action node creation failed:', error.message)
      return null
    }

    return data?.id || null
  } catch (err) {
    console.error('Action node error:', err)
    return null
  }
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
      previousActionId, // For behavioral chains
    } = body

    if (!activityType) {
      return NextResponse.json({ error: 'activityType required' }, { status: 400 })
    }

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'userId or sessionId required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const activityId = crypto.randomUUID()

    // 1. Create the activity log entry (the ledger - audit trail)
    const activity = {
      id: activityId,
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
    }

    // 2. If this is a graph-worthy action, create a node in the knowledge graph
    // This enables multi-hop queries like "patients who searched trials after Combat"
    let actionNodeId: string | null = null
    if (GRAPH_WORTHY_ACTIONS.has(activityType)) {
      // Infer journey stage - this makes the data 10x more valuable
      const journeyStage = await inferJourneyStage(supabase, userId || null, sessionId || null)

      actionNodeId = await createActionNode(
        supabase,
        activityId,
        activityType,
        userId || null,
        sessionId || null,
        cancerType || null,
        journeyStage,
        metadata,
        previousActionId
      )
    }

    // Return the action node ID so clients can build behavioral chains
    return NextResponse.json({
      success: true,
      activityId,
      actionNodeId, // Can be passed as previousActionId in next action
    })

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

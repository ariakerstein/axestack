import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Summary types we generate
type SummaryType = 'overview' | 'timeline' | 'treatment_history' | 'biomarkers' | 'open_questions'

const SUMMARY_PROMPTS: Record<SummaryType, string> = {
  overview: `You are creating a "Cancer at a Glance" summary for a patient. Based on the extracted entities, write a clear, compassionate overview in markdown format.

Include:
- Primary diagnosis with stage/grade if known
- Key biomarkers and what they mean
- Current treatment status
- Key providers/institutions

Keep it factual but warm. Use headers and bullet points. 2-3 paragraphs max. Write in second person ("You have...").`,

  timeline: `Create a chronological "Treatment Journey" timeline from the patient's entities. Format as markdown with dates as headers.

For each event:
- Date (or approximate period)
- What happened (diagnosis, treatment started, procedure, etc.)
- Key details

Use a clear timeline format. If dates are unknown, use relative ordering. Include a brief "Where You Are Now" section at the end.`,

  treatment_history: `Create a "Treatment History" summary focusing on all treatments the patient has received or is receiving.

Include for each treatment:
- Treatment name and type
- Start date (if known)
- Status (active, completed, discontinued)
- Related biomarkers that led to this treatment
- Any noted side effects

Format as markdown with clear sections per treatment.`,

  biomarkers: `Create a "Biomarker Profile" summary explaining the patient's tested biomarkers.

For each biomarker:
- Name and result (positive/negative/value)
- What this biomarker means in simple terms
- Treatment implications
- Whether it's being monitored

Group by type (genetic, protein expression, etc.). Explain in patient-friendly language.`,

  open_questions: `Based on the patient's entities, identify "Questions to Discuss with Your Care Team".

Generate 3-5 specific, relevant questions based on:
- Gaps in information (missing staging, unclear biomarkers)
- Treatment decisions that might need discussion
- Monitoring that should be happening
- Side effects or symptoms mentioned

Format as a numbered list with brief context for each question.`
}

const SUMMARY_TITLES: Record<SummaryType, string> = {
  overview: 'Your Cancer at a Glance',
  timeline: 'Your Treatment Journey',
  treatment_history: 'Treatment History',
  biomarkers: 'Your Biomarker Profile',
  open_questions: 'Questions for Your Care Team'
}

// POST - Generate or regenerate a summary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summaryType, sessionId, userId, forceRegenerate = false } = body

    if (!summaryType || !SUMMARY_PROMPTS[summaryType as SummaryType]) {
      return NextResponse.json({
        error: `Invalid summaryType. Must be one of: ${Object.keys(SUMMARY_PROMPTS).join(', ')}`
      }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Check for existing non-stale summary
    if (!forceRegenerate) {
      let query = supabase
        .from('patient_summaries')
        .select('*')
        .eq('summary_type', summaryType)
        .eq('is_stale', false)

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('session_id', sessionId)
      }

      const { data: existing } = await query.order('created_at', { ascending: false }).limit(1).single()

      if (existing) {
        return NextResponse.json({
          success: true,
          summary: existing,
          cached: true
        })
      }
    }

    // Fetch all patient entities
    let entitiesQuery = supabase
      .from('patient_entities')
      .select('*')
      .order('entity_date', { ascending: true, nullsFirst: false })

    if (userId) {
      entitiesQuery = entitiesQuery.eq('user_id', userId)
    } else {
      entitiesQuery = entitiesQuery.eq('session_id', sessionId)
    }

    const { data: entities, error: entitiesError } = await entitiesQuery

    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError)
      return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
    }

    if (!entities || entities.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No entities found. Upload some medical documents first.',
        entityCount: 0
      })
    }

    // Group entities by type for context
    const groupedEntities: Record<string, typeof entities> = {}
    for (const entity of entities) {
      if (!groupedEntities[entity.entity_type]) {
        groupedEntities[entity.entity_type] = []
      }
      groupedEntities[entity.entity_type].push(entity)
    }

    // Build context for the LLM
    const entityContext = Object.entries(groupedEntities).map(([type, items]) => {
      const itemsList = items.map(e => {
        let desc = e.entity_value
        if (e.entity_status) desc += ` (${e.entity_status})`
        if (e.entity_date) desc += ` - ${e.entity_date}`
        if (e.numeric_value && e.numeric_unit) desc += `: ${e.numeric_value} ${e.numeric_unit}`
        return `  - ${desc}`
      }).join('\n')
      return `${type.toUpperCase()}:\n${itemsList}`
    }).join('\n\n')

    // Generate summary with Claude
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${SUMMARY_PROMPTS[summaryType as SummaryType]}

PATIENT ENTITIES:
${entityContext}

Generate the ${SUMMARY_TITLES[summaryType as SummaryType]} summary in markdown format.`
        }
      ]
    })

    const summaryContent = response.content[0].type === 'text' ? response.content[0].text : ''

    // Store the summary
    const { data: savedSummary, error: saveError } = await supabase
      .from('patient_summaries')
      .insert({
        user_id: userId || null,
        session_id: sessionId || null,
        summary_type: summaryType,
        title: SUMMARY_TITLES[summaryType as SummaryType],
        content: summaryContent,
        source_entity_ids: entities.map(e => e.id),
        is_stale: false
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving summary:', saveError)
      // Return the summary even if we couldn't cache it
      return NextResponse.json({
        success: true,
        summary: {
          summary_type: summaryType,
          title: SUMMARY_TITLES[summaryType as SummaryType],
          content: summaryContent
        },
        cached: false,
        entityCount: entities.length
      })
    }

    return NextResponse.json({
      success: true,
      summary: savedSummary,
      cached: false,
      entityCount: entities.length
    })

  } catch (err) {
    console.error('Summary generation error:', err)
    return NextResponse.json({
      error: 'Failed to generate summary',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

// GET - Fetch existing summaries
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')
  const summaryType = searchParams.get('type')

  if (!sessionId && !userId) {
    return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
  }

  const supabase = getSupabase()

  let query = supabase
    .from('patient_summaries')
    .select('*')
    .eq('is_stale', false)
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('session_id', sessionId)
  }

  if (summaryType) {
    query = query.eq('summary_type', summaryType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching summaries:', error)
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 })
  }

  // Group by type for easy access
  const byType: Record<string, typeof data[0]> = {}
  for (const summary of data || []) {
    // Keep the most recent of each type
    if (!byType[summary.summary_type]) {
      byType[summary.summary_type] = summary
    }
  }

  return NextResponse.json({
    summaries: data,
    byType,
    availableTypes: Object.keys(SUMMARY_TITLES)
  })
}

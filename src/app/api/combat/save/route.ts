import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      sessionId,
      userId,
      phase,
      question,
      perspectives,
      synthesis,
      consensus,
      divergence,
      recordsSummary,
      evidenceStrength,
    } = body

    if (!sessionId || !phase || !question) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('combat_analyses')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        phase,
        question,
        perspectives: perspectives || [],
        synthesis: synthesis || '',
        consensus: consensus || [],
        divergence: divergence || [],
        records_summary: recordsSummary || { count: 0, cancer_type: null, document_types: [] },
        evidence_strength: evidenceStrength || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving combat analysis:', error)
      return NextResponse.json(
        { error: 'Failed to save analysis', details: error.message },
        { status: 500 }
      )
    }

    // Save to knowledge graph (async, non-blocking)
    // 1. Save the combat question as an entity
    ;(async () => {
      try {
        await supabase.from('patient_entities').insert({
          user_id: userId || null,
          session_id: sessionId,
          entity_type: 'combat_question',
          entity_value: question.slice(0, 500),
          entity_status: phase, // 'diagnosis' or 'treatment'
          confidence: 1.0,
          source_type: 'combat',
          metadata: {
            combat_id: data?.id,
            evidence_strength: evidenceStrength,
            record_count: recordsSummary?.count || 0,
            cancer_type: recordsSummary?.cancer_type || null,
          }
        })
        console.log('Combat question saved to graph')
      } catch (err) {
        console.error('Failed to save combat question to graph:', err)
      }
    })()

    // 2. Save consensus points as entities (key insights)
    if (consensus && consensus.length > 0) {
      ;(async () => {
        try {
          const consensusEntities = consensus.slice(0, 5).map((point: string) => ({
            user_id: userId || null,
            session_id: sessionId,
            entity_type: 'combat_insight',
            entity_value: point.slice(0, 500),
            entity_status: 'consensus',
            confidence: 0.9,
            source_type: 'combat',
            metadata: { combat_id: data?.id, phase }
          }))
          await supabase.from('patient_entities').insert(consensusEntities)
        } catch (err) {
          console.error('Failed to save consensus to graph:', err)
        }
      })()
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Combat save error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    if (!sessionId && !userId) {
      return NextResponse.json(
        { error: 'sessionId or userId required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('combat_analyses')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
    } else {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching combat analyses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Combat fetch error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

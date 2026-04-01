import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

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

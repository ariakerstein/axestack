import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface Correction {
  field: string
  original: string
  corrected: string
  note?: string
  corrected_at: string
}

// GET - Fetch corrections for a record
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('recordId')
  const sessionId = searchParams.get('sessionId')

  if (!recordId) {
    return NextResponse.json({ error: 'recordId required' }, { status: 400 })
  }

  try {
    // Try to find by record ID or session
    let query = supabase
      .from('medical_records')
      .select('id, user_corrections, corrections_updated_at')

    if (recordId.includes('-')) {
      // UUID format - query by ID
      query = query.eq('id', recordId)
    } else if (sessionId) {
      // Query by session and original_name hash
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query.single()

    if (error) {
      // Record might not be in Supabase yet (localStorage only)
      return NextResponse.json({ corrections: {}, updatedAt: null })
    }

    return NextResponse.json({
      corrections: data.user_corrections || {},
      updatedAt: data.corrections_updated_at,
    })
  } catch (err) {
    console.error('Error fetching corrections:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Save a correction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, sessionId, userId, field, original, corrected, note } = body

    if (!field || corrected === undefined) {
      return NextResponse.json({ error: 'field and corrected value required' }, { status: 400 })
    }

    const correction: Correction = {
      field,
      original: original || '',
      corrected,
      note: note || undefined,
      corrected_at: new Date().toISOString(),
    }

    // Build the update query
    let query = supabase.from('medical_records')

    // Try to find existing record
    let existingRecord = null
    if (recordId && recordId.includes('-')) {
      const { data } = await supabase
        .from('medical_records')
        .select('id, user_corrections')
        .eq('id', recordId)
        .single()
      existingRecord = data
    } else if (sessionId) {
      // For localStorage-based records, try to find by session
      const { data } = await supabase
        .from('medical_records')
        .select('id, user_corrections')
        .eq('session_id', sessionId)
        .limit(1)
        .single()
      existingRecord = data
    }

    if (existingRecord) {
      // Update existing record's corrections
      const currentCorrections = existingRecord.user_corrections || {}
      const updatedCorrections = {
        ...currentCorrections,
        [field]: correction,
      }

      const { error } = await supabase
        .from('medical_records')
        .update({
          user_corrections: updatedCorrections,
          corrections_updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)

      if (error) {
        console.error('Error updating corrections:', error)
        return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        corrections: updatedCorrections,
      })
    } else {
      // Record not in Supabase - return success for localStorage-only storage
      // Client will handle localStorage persistence
      return NextResponse.json({
        success: true,
        localOnly: true,
        correction,
      })
    }
  } catch (err) {
    console.error('Error saving correction:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove a correction
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, field } = body

    if (!recordId || !field) {
      return NextResponse.json({ error: 'recordId and field required' }, { status: 400 })
    }

    const { data: existingRecord } = await supabase
      .from('medical_records')
      .select('id, user_corrections')
      .eq('id', recordId)
      .single()

    if (!existingRecord) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const currentCorrections = existingRecord.user_corrections || {}
    delete currentCorrections[field]

    const { error } = await supabase
      .from('medical_records')
      .update({
        user_corrections: currentCorrections,
        corrections_updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    if (error) {
      console.error('Error removing correction:', error)
      return NextResponse.json({ error: 'Failed to remove correction' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      corrections: currentCorrections,
    })
  } catch (err) {
    console.error('Error removing correction:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

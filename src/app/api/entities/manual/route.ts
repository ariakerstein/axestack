import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Entity types
const VALID_ENTITY_TYPES = [
  'diagnosis',
  'biomarker',
  'treatment',
  'medication',
  'procedure',
  'lab_result',
  'provider',
  'institution',
  'symptom',
  'vital_sign'
] as const

type EntityType = typeof VALID_ENTITY_TYPES[number]

interface ManualEntityInput {
  entity_type: EntityType
  entity_value: string
  entity_date?: string
  entity_status?: string
  numeric_value?: number
  numeric_unit?: string
  reference_range?: string
  notes?: string
}

// POST - Create a new manual entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entity, sessionId, userId } = body

    if (!entity || !entity.entity_type || !entity.entity_value) {
      return NextResponse.json({ error: 'entity_type and entity_value required' }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
    }

    if (!VALID_ENTITY_TYPES.includes(entity.entity_type)) {
      return NextResponse.json({
        error: `Invalid entity_type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`
      }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('patient_entities')
      .insert({
        user_id: userId || null,
        session_id: sessionId || null,
        entity_type: entity.entity_type,
        entity_value: entity.entity_value,
        entity_date: entity.entity_date || null,
        entity_status: entity.entity_status || null,
        numeric_value: entity.numeric_value || null,
        numeric_unit: entity.numeric_unit || null,
        reference_range: entity.reference_range || null,
        source_text: 'Manual annotation',
        confidence: 1.0, // Manual annotations have full confidence
        metadata: { manual: true, notes: entity.notes || null }
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating entity:', error)
      return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 })
    }

    // Mark any existing summaries as stale
    if (userId || sessionId) {
      await supabase
        .from('patient_summaries')
        .update({ is_stale: true })
        .or(`user_id.eq.${userId || 'null'},session_id.eq.${sessionId || 'null'}`)
    }

    return NextResponse.json({ success: true, entity: data })
  } catch (err) {
    console.error('Manual entity creation error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT - Update an existing entity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entityId, updates, sessionId, userId } = body

    if (!entityId) {
      return NextResponse.json({ error: 'entityId required' }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('patient_entities')
      .select('id, user_id, session_id')
      .eq('id', entityId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Check ownership
    const isOwner = (userId && existing.user_id === userId) ||
                    (sessionId && existing.session_id === sessionId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Not authorized to update this entity' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (updates.entity_value) updateData.entity_value = updates.entity_value
    if (updates.entity_type && VALID_ENTITY_TYPES.includes(updates.entity_type)) {
      updateData.entity_type = updates.entity_type
    }
    if (updates.entity_date !== undefined) updateData.entity_date = updates.entity_date
    if (updates.entity_status !== undefined) updateData.entity_status = updates.entity_status
    if (updates.numeric_value !== undefined) updateData.numeric_value = updates.numeric_value
    if (updates.numeric_unit !== undefined) updateData.numeric_unit = updates.numeric_unit
    if (updates.reference_range !== undefined) updateData.reference_range = updates.reference_range

    const { data, error } = await supabase
      .from('patient_entities')
      .update(updateData)
      .eq('id', entityId)
      .select()
      .single()

    if (error) {
      console.error('Error updating entity:', error)
      return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 })
    }

    return NextResponse.json({ success: true, entity: data })
  } catch (err) {
    console.error('Manual entity update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove an entity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    if (!entityId) {
      return NextResponse.json({ error: 'entityId required' }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify ownership before delete
    const { data: existing, error: fetchError } = await supabase
      .from('patient_entities')
      .select('id, user_id, session_id')
      .eq('id', entityId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    const isOwner = (userId && existing.user_id === userId) ||
                    (sessionId && existing.session_id === sessionId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Not authorized to delete this entity' }, { status: 403 })
    }

    const { error } = await supabase
      .from('patient_entities')
      .delete()
      .eq('id', entityId)

    if (error) {
      console.error('Error deleting entity:', error)
      return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Manual entity deletion error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

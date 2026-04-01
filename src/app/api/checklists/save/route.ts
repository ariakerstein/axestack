import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Helper to verify auth token and get user ID securely
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.error('Auth verification failed:', error)
    return null
  }

  return user.id
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { cancerType, subtype, stage, items, appointmentNotes, updatedAt } = await request.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Upsert checklist - one per user per cancer type
    const { data, error } = await supabase
      .from('cancer_checklists')
      .upsert({
        user_id: userId,
        cancer_type: cancerType,
        subtype: subtype || null,
        stage: stage || null,
        items: items || {},
        appointment_notes: appointmentNotes || '',
        updated_at: updatedAt || new Date().toISOString(),
      }, {
        onConflict: 'user_id,cancer_type',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      // If table doesn't exist, return gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table not configured', needsSetup: true }, { status: 503 })
      }
      return NextResponse.json({ error: 'Failed to save checklist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Checklist save error:', error)
    return NextResponse.json(
      { error: 'Failed to save checklist' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cancerType = searchParams.get('cancerType')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    let query = supabase
      .from('cancer_checklists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (cancerType) {
      query = query.eq('cancer_type', cancerType)
    }

    const { data, error } = await query.limit(10)

    if (error) {
      console.error('Supabase error:', error)
      // If table doesn't exist, return empty gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ checklists: [], needsSetup: true })
      }
      return NextResponse.json({ checklists: [] })
    }

    return NextResponse.json({ checklists: data || [] })
  } catch (error) {
    console.error('Checklist fetch error:', error)
    return NextResponse.json({ checklists: [] })
  }
}

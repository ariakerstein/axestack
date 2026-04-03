import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use the same Supabase as insight-guide-query (navis)
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

  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.error('Auth verification failed:', error)
    return null
  }

  return user.id
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth and get user ID from token (NOT from request body)
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { fileName, documentType, result, documentText, chatMessages } = await request.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Save to medical_records table (existing table in insight-guide-query/navis)
    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        user_id: userId,
        original_name: fileName,
        file_path: `opencancer/${userId}/${Date.now()}_${fileName}`, // Virtual path
        file_type: fileName.split('.').pop() || 'unknown',
        file_size: 0, // Not storing actual file, just analysis
        content_type: 'application/json',
        record_type: documentType || 'document',
        source: 'opencancer',
        extracted_text: documentText?.substring(0, 100000) || null,
        ai_analysis: {
          ...result,
          chat_history: chatMessages || [],
          analyzed_at: new Date().toISOString(),
          analyzed_by: 'opencancer.ai'
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Records save error:', error)
    return NextResponse.json(
      { error: 'Failed to save record' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify auth and get user ID from token
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Return all records for the authenticated user (any source)
    const { data, error } = await supabase
      .from('medical_records')
      .select('id, original_name, record_type, created_at, ai_analysis, source')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ records: [] })
    }

    // Transform to match expected format
    const records = (data || []).map(r => ({
      id: r.id,
      fileName: r.original_name,
      documentType: r.record_type,
      date: r.created_at,
      result: r.ai_analysis,
    }))

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Records fetch error:', error)
    return NextResponse.json({ records: [] })
  }
}

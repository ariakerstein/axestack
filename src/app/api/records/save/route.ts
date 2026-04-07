import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

// Use the same Supabase as insight-guide-query (navis)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Helper to verify auth token and get user ID securely
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[Auth] No bearer token in request')
    return null
  }

  const token = authHeader.substring(7)

  // Check for required env vars
  if (!SUPABASE_URL) {
    console.error('[Auth] SUPABASE_URL is not set!')
    return null
  }
  if (!SUPABASE_SERVICE_KEY) {
    console.error('[Auth] SUPABASE_SERVICE_ROLE_KEY is not set!')
    return null
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[Auth] Verification failed:', error?.message || 'No user returned')
      return null
    }

    console.log('[Auth] Verified user:', user.id)
    return user.id
  } catch (err) {
    console.error('[Auth] Exception during verification:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log('[Records/Save] POST request received')
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = checkRateLimit(`records-save:${clientId}`, RATE_LIMITS.upload)
    if (!rateLimit.success) {
      console.log('[Records/Save] Rate limited:', clientId)
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) } }
      )
    }

    // Parse request body first to check for session-based auth
    const body = await request.json()
    const { fileName, documentType, result, analysis, documentText, chatMessages, sessionId, source } = body

    // Try to get authenticated user ID from token
    let userId = await getAuthenticatedUserId(request)

    // If no authenticated user, allow guest saves with sessionId
    if (!userId && !sessionId) {
      console.log('[Records/Save] No authenticated user and no sessionId - returning 401')
      return NextResponse.json({ error: 'Authentication or sessionId required' }, { status: 401 })
    }

    console.log('[Records/Save] Saving record:', fileName, 'for user:', userId || `guest:${sessionId}`)

    // Check if we have service role key (required for bypassing RLS)
    const hasServiceKey = SUPABASE_SERVICE_KEY && SUPABASE_SERVICE_KEY.startsWith('eyJ')
    if (!hasServiceKey) {
      console.error('[Records/Save] SUPABASE_SERVICE_ROLE_KEY is not set or invalid!')
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Service role key not configured'
      }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Support both 'result' and 'analysis' field names for backwards compatibility
    const analysisData = result || analysis

    // For guests, use a special user_id format or store session_id
    // Since medical_records requires user_id, we'll use a session-prefixed id for guests
    const effectiveUserId = userId || `session:${sessionId}`
    const identifier = userId || sessionId

    // Save to medical_records table
    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        user_id: effectiveUserId,
        original_name: fileName,
        file_path: `opencancer/${identifier}/${Date.now()}_${fileName}`, // Virtual path
        file_type: fileName.split('.').pop() || 'unknown',
        file_size: 0, // Not storing actual file, just analysis
        content_type: 'application/json',
        record_type: documentType || analysisData?.document_type || 'document',
        source: source || 'opencancer',
        extracted_text: documentText?.substring(0, 100000) || null,
        ai_analysis: {
          ...analysisData,
          chat_history: chatMessages || [],
          analyzed_at: new Date().toISOString(),
          analyzed_by: 'opencancer.ai',
          session_id: sessionId || null, // Store session for later claiming
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2))
      console.error('Insert was:', { user_id: effectiveUserId, original_name: fileName, record_type: documentType })
      return NextResponse.json({
        error: 'Failed to save record',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('[Records/Save] Record saved successfully:', data?.id)
    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[Records/Save] Error:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      {
        error: 'Failed to save record',
        details: errorMessage,
        // Only include stack in dev
        ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

// GET - Fetch authenticated user's records
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = checkRateLimit(`records-get:${clientId}`, RATE_LIMITS.standard)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) } }
      )
    }

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

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

    // Check if we have service role key (required for bypassing RLS)
    const hasServiceKey = SUPABASE_SERVICE_KEY && SUPABASE_SERVICE_KEY.startsWith('eyJ')
    if (!hasServiceKey) {
      console.error('No valid service role key found - using anon key will fail')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    console.log('Saving record for user:', userId, 'file:', fileName)

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
      console.error('Supabase insert error:', JSON.stringify(error, null, 2))
      console.error('Insert was:', { user_id: userId, original_name: fileName, record_type: documentType })
      return NextResponse.json({
        error: 'Failed to save record',
        details: error.message,
        code: error.code
      }, { status: 500 })
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

// Debug endpoint - GET without auth to test service key
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const debug = searchParams.get('debug')

  // Create or update user password (admin only)
  if (debug === 'create-user' || debug === 'set-password') {
    const email = searchParams.get('email')
    const password = searchParams.get('password')

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // First try to find the user by email (paginated search)
    let existingUser = null
    let page = 1
    const perPage = 100
    while (true) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage })
      if (!users || users.length === 0) break
      existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingUser) break
      if (users.length < perPage) break
      page++
    }

    if (existingUser) {
      // Update existing user's password
      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        userId: data.user?.id,
        email: data.user?.email,
        message: 'Password updated. User can now login with this password.'
      })
    } else {
      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        userId: data.user?.id,
        email: data.user?.email,
        message: 'User created. They can now login with this password.'
      })
    }
  }

  // Allow debug mode only to check if service key works
  if (debug === 'test') {
    const email = searchParams.get('email')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Count all records
    const { count: totalCount } = await supabase
      .from('medical_records')
      .select('*', { count: 'exact', head: true })

    // Count opencancer records
    const { count: opencancerCount } = await supabase
      .from('medical_records')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'opencancer')

    // If email provided, look up user in both profiles and auth.users
    let userRecords = null
    let userId = null
    let authUserId = null
    let profileMatch = null
    if (email) {
      // Try profiles table - search by email OR name containing search term
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, display_name')
        .or(`email.ilike.%${email}%,full_name.ilike.%${email}%,display_name.ilike.%${email}%`)
        .limit(5)

      if (profiles && profiles.length > 0) {
        profileMatch = profiles
        userId = profiles[0].user_id
      }

      // Also check auth.users via admin API (paginated search)
      let authUser = null
      let page = 1
      const perPage = 100
      while (!authUser) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage })
        if (!users || users.length === 0) break
        authUser = users.find(u => u.email?.toLowerCase().includes(email.toLowerCase()))
        if (users.length < perPage) break
        page++
      }
      if (authUser) {
        authUserId = authUser.id
        userId = userId || authUser.id
      }

      if (userId) {
        const { count } = await supabase
          .from('medical_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        userRecords = count
      }
    }

    // List recent auth users or profiles
    let recentAuthUsers = null
    let allProfiles = null
    if (!email || email === 'list') {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      recentAuthUsers = users?.slice(0, 20).map(u => ({
        email: u.email,
        created: u.created_at,
        lastSignIn: u.last_sign_in_at
      }))

      // Also get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, full_name, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(30)
      allProfiles = profiles
    }

    return NextResponse.json({
      totalRecords: totalCount,
      opencancerRecords: opencancerCount,
      searchTerm: email,
      profileMatches: profileMatch,
      authUserId,
      userRecords,
      recentAuthUsers,
      allProfiles,
    })
  }

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

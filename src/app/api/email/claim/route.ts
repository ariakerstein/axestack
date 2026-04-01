import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = [
  'admin', 'support', 'help', 'info', 'contact', 'team',
  'hello', 'mail', 'noreply', 'no-reply', 'postmaster',
  'webmaster', 'abuse', 'security', 'billing', 'sales',
  'cancer', 'oncologist', 'doctor', 'patient', 'navis',
  'combat', 'records', 'vault', 'api', 'system', 'test',
  'demo', 'example', 'null', 'undefined', 'root', 'www'
]

// Validate username format
function isValidUsername(username: string): { valid: boolean; error?: string } {
  // Must be 3-30 characters
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }
  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' }
  }

  // Must start with a letter
  if (!/^[a-z]/i.test(username)) {
    return { valid: false, error: 'Username must start with a letter' }
  }

  // Only letters, numbers, dots, and hyphens
  if (!/^[a-z][a-z0-9._-]*$/i.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, dots, and hyphens' }
  }

  // No consecutive dots or hyphens
  if (/[._-]{2}/.test(username)) {
    return { valid: false, error: 'Username cannot have consecutive dots or hyphens' }
  }

  // Cannot end with dot or hyphen
  if (/[._-]$/.test(username)) {
    return { valid: false, error: 'Username cannot end with a dot or hyphen' }
  }

  // Not reserved
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' }
  }

  return { valid: true }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, sessionId, userId, displayName } = body

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: 'Session ID or User ID is required' }, { status: 400 })
    }

    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase().trim()

    // Validate username
    const validation = isValidUsername(normalizedUsername)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const supabase = getSupabase()

    // Check if username is already taken
    const { data: existing } = await supabase
      .from('email_addresses')
      .select('id')
      .eq('username', normalizedUsername)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
    }

    // Check if user/session already has an email address
    let existingForUser
    if (userId) {
      const { data } = await supabase
        .from('email_addresses')
        .select('username, email_address')
        .eq('user_id', userId)
        .single()
      existingForUser = data
    } else {
      const { data } = await supabase
        .from('email_addresses')
        .select('username, email_address')
        .eq('session_id', sessionId)
        .single()
      existingForUser = data
    }

    if (existingForUser) {
      return NextResponse.json({
        error: 'You already have an email address',
        existing: existingForUser
      }, { status: 409 })
    }

    // Create the email address
    const { data: newEmail, error } = await supabase
      .from('email_addresses')
      .insert({
        username: normalizedUsername,
        user_id: userId || null,
        session_id: sessionId || null,
        display_name: displayName || null,
        is_verified: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Email claim error:', error)
      return NextResponse.json({ error: 'Failed to claim email address' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email_address: `${normalizedUsername}@opencancer.ai`,
      username: normalizedUsername,
      id: newEmail.id,
      message: `Your email ${normalizedUsername}@opencancer.ai has been claimed! Forward medical documents there and they'll appear in your Records Vault.`
    })
  } catch (err) {
    console.error('Email claim error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Check if username is available
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  const normalizedUsername = username.toLowerCase().trim()

  // Validate format first
  const validation = isValidUsername(normalizedUsername)
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      error: validation.error
    })
  }

  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('email_addresses')
    .select('id')
    .eq('username', normalizedUsername)
    .single()

  return NextResponse.json({
    available: !existing,
    username: normalizedUsername,
    email_address: `${normalizedUsername}@opencancer.ai`
  })
}

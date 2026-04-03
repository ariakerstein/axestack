import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// GET - Check email status and optionally link to user account
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')
  const debug = searchParams.get('debug') === 'true'

  if (!sessionId && !userId) {
    return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // First, try to find by user_id if provided
    if (userId) {
      const { data: userEmail, error: userError } = await supabase
        .from('email_addresses')
        .select('id, username, is_active, user_id, session_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (debug) {
        console.log(`Status check: userId=${userId}, found=${!!userEmail}, error=${userError?.message}`)
      }

      if (userEmail) {
        return NextResponse.json({
          claimed: true,
          emailAddressId: userEmail.id,
          username: userEmail.username,
          email: `${userEmail.username}@opencancer.ai`,
          source: 'user_id'
        })
      }
    }

    // Then, check by session_id
    if (sessionId) {
      const { data: sessionEmail, error: sessionError } = await supabase
        .from('email_addresses')
        .select('id, username, is_active, user_id, session_id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single()

      if (debug) {
        console.log(`Status check: sessionId=${sessionId}, found=${!!sessionEmail}, error=${sessionError?.message}`)
      }

      if (sessionEmail) {
        // If user is logged in but email was claimed with session, link them
        if (userId && !sessionEmail.user_id) {
          console.log(`Linking email ${sessionEmail.username}@opencancer.ai to user ${userId}`)

          const { error: updateError } = await supabase
            .from('email_addresses')
            .update({ user_id: userId })
            .eq('id', sessionEmail.id)

          if (updateError) {
            console.error('Failed to link email to user:', updateError)
          }
        }

        return NextResponse.json({
          claimed: true,
          emailAddressId: sessionEmail.id,
          username: sessionEmail.username,
          email: `${sessionEmail.username}@opencancer.ai`,
          linked: userId && !sessionEmail.user_id,
          source: 'session_id'
        })
      }
    }

    // No email found
    return NextResponse.json({
      claimed: false,
      debug: debug ? { sessionId, userId } : undefined
    })

  } catch (err) {
    console.error('Email status error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Link a username to a user account (for reclaiming)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, userId, sessionId } = body

    if (!username) {
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required (must be logged in)' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Find the email address by username
    const { data: emailRecord, error: findError } = await supabase
      .from('email_addresses')
      .select('id, username, user_id, session_id, is_active')
      .eq('username', username.toLowerCase())
      .single()

    if (findError || !emailRecord) {
      return NextResponse.json({ error: 'Email address not found' }, { status: 404 })
    }

    // Check if already linked to a different user
    if (emailRecord.user_id && emailRecord.user_id !== userId) {
      return NextResponse.json({
        error: 'This email is already linked to another account'
      }, { status: 403 })
    }

    // If sessionId matches or no user_id set, allow linking
    if (!emailRecord.user_id || (sessionId && emailRecord.session_id === sessionId)) {
      const { error: updateError } = await supabase
        .from('email_addresses')
        .update({ user_id: userId })
        .eq('id', emailRecord.id)

      if (updateError) {
        console.error('Failed to link email:', updateError)
        return NextResponse.json({ error: 'Failed to link email' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        email: `${emailRecord.username}@opencancer.ai`,
        message: 'Email successfully linked to your account'
      })
    }

    return NextResponse.json({
      error: 'Cannot link this email - no matching session'
    }, { status: 403 })

  } catch (err) {
    console.error('Email link error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

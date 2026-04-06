import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionId } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Save profile to opencancer_profiles table (bypasses RLS with service key)
export async function POST(request: NextRequest) {
  try {
    const { email, name, role, cancerType, stage, location, sessionId } = await request.json()

    if (!email || !name || !role || !cancerType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check for service key
    if (!SUPABASE_SERVICE_KEY) {
      console.error('[Profile] SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check if profile exists for this email
    const { data: existing } = await supabase
      .from('opencancer_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      // Update existing profile
      const { data: profile, error } = await supabase
        .from('opencancer_profiles')
        .update({
          session_id: sessionId || null,
          name: name.trim(),
          role,
          cancer_type: cancerType,
          stage: stage || null,
          location: location || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[Profile] Update error:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      console.log('[Profile] Updated:', email)
      return NextResponse.json({ success: true, profile, created: false })
    } else {
      // Create new profile
      const { data: profile, error } = await supabase
        .from('opencancer_profiles')
        .insert({
          session_id: sessionId || null,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role,
          cancer_type: cancerType,
          stage: stage || null,
          location: location || null,
        })
        .select()
        .single()

      if (error) {
        console.error('[Profile] Insert error:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      console.log('[Profile] Created:', email)
      return NextResponse.json({ success: true, profile, created: true })
    }
  } catch (err) {
    console.error('[Profile] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Track analytics events (bypasses RLS with service key)
export async function POST(request: NextRequest) {
  try {
    const { eventType, pagePath, sessionId, metadata, referrer, userAgent } = await request.json()

    if (!eventType) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
    }

    // Use service key if available, fall back to anon key
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

    if (!key) {
      console.error('[Analytics] No Supabase key configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, key)

    const { error } = await supabase.from('analytics_events').insert({
      user_id: null, // Anonymous
      event_type: eventType,
      page_path: pagePath,
      referrer: referrer || null,
      user_agent: userAgent || null,
      session_id: sessionId,
      metadata: {
        ...metadata,
        app: 'opencancer',
        timestamp: new Date().toISOString(),
      },
      event_timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('[Analytics] Insert error:', error)
      // Don't return error to client - analytics failures shouldn't block UX
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Analytics] Error:', err)
    return NextResponse.json({ success: false })
  }
}

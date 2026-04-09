import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  // Check env vars
  results.env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  }

  // Test with service key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (serviceKey) {
    const supabase = createClient(SUPABASE_URL, serviceKey)

    // Test insert
    const testEvent = {
      user_id: null,
      event_type: 'debug_test',
      page_path: '/admin/debug',
      session_id: `debug-${Date.now()}`,
      metadata: { test: true, timestamp: new Date().toISOString() },
      event_timestamp: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await supabase
      .from('analytics_events')
      .insert(testEvent)
      .select()

    results.checks = {
      ...results.checks as object,
      serviceKeyInsert: {
        success: !insertError,
        error: insertError?.message || null,
        data: insertData,
      },
    }

    // Count recent events
    const { count, error: countError } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('event_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    results.checks = {
      ...results.checks as object,
      eventsLast24h: {
        count,
        error: countError?.message || null,
      },
    }

    // Get latest 5 events
    const { data: recentEvents, error: recentError } = await supabase
      .from('analytics_events')
      .select('event_type, page_path, event_timestamp, session_id')
      .order('event_timestamp', { ascending: false })
      .limit(5)

    results.checks = {
      ...results.checks as object,
      recentEvents: {
        data: recentEvents,
        error: recentError?.message || null,
      },
    }

    // Clean up test event
    await supabase
      .from('analytics_events')
      .delete()
      .eq('event_type', 'debug_test')

  } else {
    results.checks = {
      ...results.checks as object,
      serviceKeyInsert: {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured',
      },
    }
  }

  // Test with anon key (should fail due to RLS)
  if (anonKey) {
    const supabaseAnon = createClient(SUPABASE_URL, anonKey)
    const { error: anonError } = await supabaseAnon
      .from('analytics_events')
      .insert({
        event_type: 'debug_anon_test',
        page_path: '/test',
        session_id: 'anon-test',
        event_timestamp: new Date().toISOString(),
      })

    results.checks = {
      ...results.checks as object,
      anonKeyInsert: {
        success: !anonError,
        error: anonError?.message || null,
        note: anonError ? 'Expected - RLS should block anon inserts' : 'Unexpected - RLS may be disabled',
      },
    }
  }

  return NextResponse.json(results)
}

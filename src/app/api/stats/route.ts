import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

// Base number to start from (historical estimates before tracking)
const BASE_TRANSLATIONS = 12800

// Round down to nearest increment for display (100, 500, 1000)
function roundForDisplay(n: number): number {
  if (n >= 1000) return Math.floor(n / 100) * 100
  if (n >= 500) return Math.floor(n / 50) * 50
  return Math.floor(n / 10) * 10
}

export async function GET() {
  try {
    // Use service key to bypass RLS on api_usage table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Count actual tracked translations
    const { count, error } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'opencancer')
      .eq('success', true)

    if (error) {
      console.error('Stats query error:', error)
    }

    const totalTranslations = BASE_TRANSLATIONS + (count || 0)

    // Get unique sessions from last 30 days for social proof
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sessions } = await supabase
      .from('analytics_events')
      .select('session_id')
      .gte('event_timestamp', thirtyDaysAgo.toISOString())

    const uniqueSessions = sessions ? new Set(sessions.map(s => s.session_id)).size : 0
    const displayCount = roundForDisplay(uniqueSessions)

    return NextResponse.json({
      totalTranslations,
      trackedTranslations: count || 0,
      // For social proof display (only show if > 100)
      uniqueSessions,
      displayCount: displayCount >= 100 ? displayCount : null,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ totalTranslations: BASE_TRANSLATIONS })
  }
}

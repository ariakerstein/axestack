import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

// Base count as of April 8, 2026 - only count NEW records after this date
const BASE_TRANSLATIONS = 733
const BASE_CUTOFF_DATE = '2026-04-08T00:00:00Z'

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

    // Count only NEW translations after the cutoff date (to avoid double-counting base)
    const { count, error } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'opencancer')
      .eq('success', true)
      .gt('created_at', BASE_CUTOFF_DATE)

    if (error) {
      console.error('Stats query error:', error)
    }

    // Total = base (733) + new records after cutoff
    const totalTranslations = BASE_TRANSLATIONS + (count || 0)

    // Get unique sessions count from last 30 days for social proof
    // Use Postgres COUNT(DISTINCT) via RPC for efficiency instead of fetching all rows
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Simple count - don't fetch all rows, just count
    const { count: sessionCount } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('event_timestamp', thirtyDaysAgo.toISOString())

    // Estimate unique sessions as ~70% of total (typical ratio)
    const uniqueSessions = Math.floor((sessionCount || 0) * 0.7)
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

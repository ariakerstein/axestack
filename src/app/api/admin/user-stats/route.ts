import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const userEmail = searchParams.get('email')

  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!userId && !userEmail) {
    return NextResponse.json({ error: 'userId or email required' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    // Get the auth user ID by email (combat_analyses uses auth.users ID, not profile ID)
    let authUserId: string | null = null
    if (userEmail) {
      try {
        const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const authUser = authData?.users?.find(u => u.email === userEmail)
        if (authUser) {
          authUserId = authUser.id
        }
      } catch (err) {
        console.error('Error looking up auth user:', err)
      }
    }

    // Get all events for this user (by user_id in metadata or by matching session patterns)
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('event_timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Filter events that belong to this user
    const userEvents = (events || []).filter((e: {
      metadata?: { user_id?: string; email?: string }
    }) => {
      if (userId && e.metadata?.user_id === userId) return true
      if (userEmail && e.metadata?.email === userEmail) return true
      return false
    })

    // Calculate stats
    const recordUploads = userEvents.filter((e: { event_type: string }) => e.event_type === 'record_upload')
    const questions = userEvents.filter((e: { event_type: string }) => e.event_type === 'ask_question')
    const pageViews = userEvents.filter((e: { event_type: string }) => e.event_type === 'page_view')
    const combatRuns = userEvents.filter((e: { event_type: string }) => e.event_type === 'combat_run')
    const trialSearches = userEvents.filter((e: { event_type: string }) => e.event_type === 'trial_search')

    // Get unique sessions
    const sessions = new Set(userEvents.map((e: { session_id: string }) => e.session_id))

    // Get first and last activity
    const timestamps = userEvents.map((e: { event_timestamp: string }) => new Date(e.event_timestamp).getTime())
    const firstActivity = timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : null
    const lastActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null

    // Get pages visited
    const pagesVisited: Record<string, number> = {}
    pageViews.forEach((e: { page_path: string }) => {
      pagesVisited[e.page_path] = (pagesVisited[e.page_path] || 0) + 1
    })

    // Get recent activity (last 20 events)
    const recentActivity = userEvents.slice(0, 20).map((e: {
      event_type: string
      page_path: string
      event_timestamp: string
      metadata?: Record<string, unknown>
    }) => ({
      type: e.event_type,
      path: e.page_path,
      timestamp: e.event_timestamp,
      metadata: e.metadata
    }))

    // Aggregate device types from user's events
    const deviceCounts: Record<string, number> = {}
    userEvents.forEach((e: { metadata?: { device_type?: string } }) => {
      const device = e.metadata?.device_type || 'unknown'
      deviceCounts[device] = (deviceCounts[device] || 0) + 1
    })

    // Get primary device (most used)
    const primaryDevice = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

    // Get traffic sources for this user
    const trafficCounts: Record<string, number> = {}
    userEvents.forEach((e: { metadata?: { traffic_source?: string } }) => {
      const source = e.metadata?.traffic_source || 'unknown'
      trafficCounts[source] = (trafficCounts[source] || 0) + 1
    })

    const primaryTrafficSource = Object.entries(trafficCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

    // Get combat analyses for this user (use authUserId since combat saves auth.users ID)
    let combatAnalyses: Array<{
      phase: string
      created_at: string
      evidence_strength: number
      records_summary?: { cancer_type?: string; count?: number }
    }> = []

    const combatUserId = authUserId || userId
    if (combatUserId) {
      const { data: combats } = await supabase
        .from('combat_analyses')
        .select('phase, created_at, evidence_strength, records_summary')
        .eq('user_id', combatUserId)
        .order('created_at', { ascending: false })
        .limit(10)

      combatAnalyses = combats || []
    }

    return NextResponse.json({
      userId,
      authUserId,
      email: userEmail,
      stats: {
        totalEvents: userEvents.length,
        recordsUploaded: recordUploads.length,
        questionsAsked: questions.length,
        pageViews: pageViews.length,
        combatRuns: combatRuns.length,
        trialSearches: trialSearches.length,
        uniqueSessions: sessions.size,
        firstActivity,
        lastActivity,
      },
      deviceInfo: {
        primary: primaryDevice,
        all: Object.entries(deviceCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([device, count]) => ({ device, count }))
      },
      trafficInfo: {
        primary: primaryTrafficSource,
        all: Object.entries(trafficCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([source, count]) => ({ source, count }))
      },
      pagesVisited: Object.entries(pagesVisited)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      recentActivity,
      combatAnalyses: combatAnalyses.map(c => ({
        phase: c.phase,
        createdAt: c.created_at,
        evidenceStrength: c.evidence_strength,
        cancerType: c.records_summary?.cancer_type || 'unknown',
        recordsCount: c.records_summary?.count || 0
      }))
    })
  } catch (err) {
    console.error('User stats error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

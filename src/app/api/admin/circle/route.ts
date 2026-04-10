import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateISO = startDate.toISOString()

  try {
    const supabase = getSupabase()

    // Fetch all circle-app page views and events
    const [
      { count: totalPageViews },
      { data: circleEvents },
      { data: circleActivities }
    ] = await Promise.all([
      // Total circle-app page views (all time vs period)
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('page_path', '/circle-app')
        .gte('event_timestamp', startDateISO),
      // Detailed events for circle-app (limited)
      supabase
        .from('analytics_events')
        .select('event_type, page_path, session_id, event_timestamp, metadata')
        .eq('page_path', '/circle-app')
        .gte('event_timestamp', startDateISO)
        .order('event_timestamp', { ascending: false })
        .limit(1000),
      // Circle-related activities from patient_activity
      supabase
        .from('patient_activity')
        .select('activity_type, user_id, session_id, created_at, metadata')
        .ilike('activity_type', '%circle%')
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    const events = circleEvents || []
    const activities = circleActivities || []

    // Unique sessions
    const uniqueSessions = new Set(events.map((e: { session_id: string }) => e.session_id)).size

    // Count questions asked from circle-app (looking at ask_question events with circle referrer)
    const questionsAsked = events.filter((e: { event_type: string }) => e.event_type === 'ask_question').length

    // Daily views breakdown
    const dailyViewsMap: Record<string, number> = {}
    events.forEach((e: { event_type: string; event_timestamp: string }) => {
      if (e.event_type === 'page_view') {
        const date = e.event_timestamp.split('T')[0]
        dailyViewsMap[date] = (dailyViewsMap[date] || 0) + 1
      }
    })
    const dailyViews = Object.entries(dailyViewsMap)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Recent activity (both page views and activities)
    const recentActivity = [
      ...events.slice(0, 30).map((e: { event_timestamp: string; event_type: string; session_id: string }) => ({
        timestamp: e.event_timestamp,
        eventType: e.event_type,
        sessionId: e.session_id?.slice(0, 8) || 'unknown'
      })),
      ...activities.slice(0, 20).map((a: { created_at: string; activity_type: string; session_id: string | null }) => ({
        timestamp: a.created_at,
        eventType: a.activity_type,
        sessionId: a.session_id?.slice(0, 8) || 'unknown'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 50)

    // Events by type
    const eventsByType: Record<string, number> = {}
    events.forEach((e: { event_type: string }) => {
      eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1
    })

    // Get all-time stats for comparison
    const { count: allTimePageViews } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('page_path', '/circle-app')

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalPageViews: totalPageViews || 0,
        allTimePageViews: allTimePageViews || 0,
        uniqueSessions,
        questionsAsked,
        circleActivities: activities.length
      },
      eventsByType: Object.entries(eventsByType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      dailyViews,
      recentActivity
    })
  } catch (err) {
    console.error('Circle analytics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

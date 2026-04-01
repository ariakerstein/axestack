import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

// Lazy-initialize Supabase client to avoid build-time errors
function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  // Simple auth check - require admin password in header
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || 'opencancer-admin-2024'

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const supabase = getSupabase()

    // Get all events for opencancer app
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('event_timestamp', startDate.toISOString())
      .order('event_timestamp', { ascending: false })

    if (error) {
      console.error('Analytics query error:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Filter to opencancer events
    const opencancerEvents = (events || []).filter(
      (e: { metadata?: { app?: string } }) => e.metadata?.app === 'opencancer'
    )

    // Calculate metrics
    const totalPageViews = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'page_view').length
    const uniqueSessions = new Set(opencancerEvents.map((e: { session_id: string }) => e.session_id)).size

    // Page views by path
    const pageViewsByPath: Record<string, number> = {}
    opencancerEvents
      .filter((e: { event_type: string }) => e.event_type === 'page_view')
      .forEach((e: { page_path: string }) => {
        pageViewsByPath[e.page_path] = (pageViewsByPath[e.page_path] || 0) + 1
      })

    // Events by type
    const eventsByType: Record<string, number> = {}
    opencancerEvents.forEach((e: { event_type: string }) => {
      eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1
    })

    // Daily breakdown
    const dailyStats: Record<string, { views: number; sessions: Set<string>; events: Record<string, number> }> = {}
    opencancerEvents.forEach((e: { event_timestamp: string; session_id: string; event_type: string }) => {
      const date = e.event_timestamp.split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { views: 0, sessions: new Set(), events: {} }
      }
      if (e.event_type === 'page_view') {
        dailyStats[date].views++
      }
      dailyStats[date].sessions.add(e.session_id)
      dailyStats[date].events[e.event_type] = (dailyStats[date].events[e.event_type] || 0) + 1
    })

    // Convert daily stats to serializable format
    const dailyBreakdown = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        views: stats.views,
        sessions: stats.sessions.size,
        events: stats.events,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Get specific action counts
    const askQuestions = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'ask_question').length
    const recordsUploaded = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'record_upload').length
    const checklistViews = opencancerEvents.filter((e: { event_type: string; page_path: string }) =>
      e.event_type === 'page_view' && e.page_path === '/cancer-checklist'
    ).length
    const trialsSearches = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'trial_search').length
    const profileCreations = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'profile_created').length

    // Recent events (last 50)
    const recentEvents = opencancerEvents.slice(0, 50).map((e: {
      event_type: string
      page_path: string
      event_timestamp: string
      session_id: string
      metadata?: Record<string, unknown>
    }) => ({
      type: e.event_type,
      path: e.page_path,
      timestamp: e.event_timestamp,
      sessionId: e.session_id?.slice(0, 8),
      metadata: e.metadata,
    }))

    // Traffic sources breakdown (from metadata.traffic_source)
    const trafficSources: Record<string, number> = {}
    opencancerEvents.forEach((e: { metadata?: { traffic_source?: string } }) => {
      const source = e.metadata?.traffic_source || 'unknown'
      trafficSources[source] = (trafficSources[source] || 0) + 1
    })

    // Device type breakdown (from metadata.device_type)
    const deviceTypes: Record<string, number> = {}
    opencancerEvents.forEach((e: { metadata?: { device_type?: string } }) => {
      const device = e.metadata?.device_type || 'unknown'
      deviceTypes[device] = (deviceTypes[device] || 0) + 1
    })

    // Avg records per user (users with at least 1 upload)
    const recordUploads = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'record_upload')
    const usersWithRecords = new Set(
      recordUploads
        .filter((e: { metadata?: { user_id?: string } }) => e.metadata?.user_id)
        .map((e: { metadata?: { user_id?: string } }) => e.metadata?.user_id)
    )
    const avgRecordsPerUser = usersWithRecords.size > 0
      ? (recordUploads.filter((e: { metadata?: { user_id?: string } }) => e.metadata?.user_id).length / usersWithRecords.size).toFixed(1)
      : '0'

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalPageViews,
        uniqueSessions,
        askQuestions,
        recordsUploaded,
        checklistViews,
        trialsSearches,
        profileCreations,
        avgRecordsPerUser: parseFloat(avgRecordsPerUser),
        usersWithRecords: usersWithRecords.size,
      },
      pageViewsByPath: Object.entries(pageViewsByPath)
        .sort((a, b) => b[1] - a[1])
        .map(([path, count]) => ({ path, count })),
      eventsByType: Object.entries(eventsByType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      trafficSources: Object.entries(trafficSources)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ source, count })),
      deviceTypes: Object.entries(deviceTypes)
        .sort((a, b) => b[1] - a[1])
        .map(([device, count]) => ({ device, count })),
      dailyBreakdown,
      recentEvents,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

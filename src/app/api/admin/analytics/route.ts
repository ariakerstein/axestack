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

    // Use all events - this is the opencancer analytics table
    // (Previously filtered to metadata.app === 'opencancer', but older events may not have this tag)
    const opencancerEvents = events || []

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

    // Get action counts from patient_activity (authoritative source, all time)
    const { data: patientActivities } = await supabase
      .from('patient_activity')
      .select('activity_type, user_id')

    const recordUploaders = new Set<string>()
    const questionAskers = new Set<string>()
    let recordsUploaded = 0
    let askQuestions = 0
    let trialsSearches = 0

    patientActivities?.forEach((a: { activity_type: string; user_id: string | null }) => {
      if (a.activity_type === 'record_upload') {
        recordsUploaded++
        if (a.user_id) recordUploaders.add(a.user_id)
      }
      if (a.activity_type === 'ask_question') {
        askQuestions++
        if (a.user_id) questionAskers.add(a.user_id)
      }
      if (a.activity_type === 'trial_search') {
        trialsSearches++
      }
    })

    // Get question details for drill-down (still from analytics_events for metadata)
    const askQuestionEvents = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'ask_question')
    const questionDetails = askQuestionEvents.map((e: {
      event_timestamp: string
      session_id: string
      metadata?: { question?: string; cancer_type?: string }
    }) => ({
      timestamp: e.event_timestamp,
      sessionId: e.session_id?.substring(0, 8),
      question: e.metadata?.question?.substring(0, 150) || '[No question text]',
      cancerType: e.metadata?.cancer_type || 'General',
    })).slice(0, 50) // Limit to 50 most recent

    const checklistViews = opencancerEvents.filter((e: { event_type: string; page_path: string }) =>
      e.event_type === 'page_view' && e.page_path === '/cancer-checklist'
    ).length

    // Count actual users from auth.users (not profiles table which may be empty)
    // Filter out test accounts
    const isTestEmail = (email: string): boolean => {
      if (!email) return true
      const lower = email.toLowerCase()
      // Filter patterns for test/fake accounts
      if (lower.includes('test')) return true
      if (lower.includes('asdf')) return true
      if (lower.includes('ariakerstein+')) return true // Dev test accounts
      if (/^[a-z]{3,6}@gmail\.com$/.test(lower)) return true // Short random emails like "uueu@gmail.com"
      if (/^[a-z]+\d+@gmail\.com$/.test(lower) && lower.length < 20) return true // "jenny2@gmail.com" style
      if (lower.includes('ffdfd') || lower.includes('weewew') || lower.includes('hhfr')) return true
      return false
    }

    let totalUserCount = 0
    let usersCreatedInPeriod = 0
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        perPage: 1000, // Get up to 1000 users
      })
      if (authError) {
        console.error('Error fetching auth users:', authError)
      } else if (authData?.users) {
        const realUsers = authData.users.filter(
          (u: { email?: string }) => !isTestEmail(u.email || '')
        )
        totalUserCount = realUsers.length
        usersCreatedInPeriod = realUsers.filter(
          (u: { created_at: string }) => new Date(u.created_at) >= startDate
        ).length
      }
      console.log('User stats:', { totalUserCount, usersCreatedInPeriod })
    } catch (err) {
      console.error('Auth admin error:', err)
    }

    // Get actual profiles from opencancer_profiles table
    let totalProfileCount = 0
    let profilesCreatedInPeriod = 0
    try {
      const { data: allProfiles, error: profilesError } = await supabase
        .from('opencancer_profiles')
        .select('id, created_at')

      if (!profilesError && allProfiles) {
        totalProfileCount = allProfiles.length
        profilesCreatedInPeriod = allProfiles.filter(
          (p: { created_at: string }) => new Date(p.created_at) >= startDate
        ).length
      }
      console.log('Profile stats:', { totalProfileCount, profilesCreatedInPeriod })
    } catch (err) {
      console.error('Profiles query error:', err)
    }

    // Get Combat analyses stats from combat_analyses table
    const { data: combatAnalyses, error: combatError } = await supabase
      .from('combat_analyses')
      .select('id, phase, records_summary, evidence_strength, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    const combatStats = {
      total: combatAnalyses?.length || 0,
      diagnosis: combatAnalyses?.filter(c => c.phase === 'diagnosis').length || 0,
      treatment: combatAnalyses?.filter(c => c.phase === 'treatment').length || 0,
      avgEvidenceStrength: combatAnalyses?.length
        ? Math.round(combatAnalyses.reduce((sum, c) => sum + (c.evidence_strength || 0), 0) / combatAnalyses.length)
        : 0,
      byCancerType: {} as Record<string, number>,
      recentCombats: (combatAnalyses || []).slice(0, 10).map(c => ({
        phase: c.phase,
        cancerType: c.records_summary?.cancer_type || 'unknown',
        recordsCount: c.records_summary?.count || 0,
        evidenceStrength: c.evidence_strength,
        createdAt: c.created_at,
      })),
    }

    // Count by cancer type
    combatAnalyses?.forEach(c => {
      const cancerType = c.records_summary?.cancer_type || 'unknown'
      combatStats.byCancerType[cancerType] = (combatStats.byCancerType[cancerType] || 0) + 1
    })

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

    // Records analytics - use patient_activity (authoritative) for uploaders
    // recordUploaders and recordsUploaded already computed from patient_activity above
    const avgRecordsPerUser = recordUploaders.size > 0
      ? (recordsUploaded / recordUploaders.size).toFixed(1)
      : '0'

    // Session counts still from analytics_events (for anonymous tracking)
    const recordUploads = opencancerEvents.filter((e: { event_type: string }) => e.event_type === 'record_upload')
    const sessionsWithRecords = new Set(
      recordUploads.map((e: { session_id: string }) => e.session_id)
    )
    const avgRecordsPerSession = sessionsWithRecords.size > 0
      ? (recordUploads.length / sessionsWithRecords.size).toFixed(1)
      : '0'

    // === SHARING & VIRAL METRICS ===

    // Share events breakdown
    const shareEvents = opencancerEvents.filter((e: { event_type: string }) =>
      e.event_type === 'share' || e.event_type === 'combat_shared'
    )

    const sharesByTool: Record<string, number> = {}
    const sharesByMethod: Record<string, number> = {}
    shareEvents.forEach((e: { metadata?: { tool?: string; method?: string } }) => {
      const tool = e.metadata?.tool || 'unknown'
      const method = e.metadata?.method || 'unknown'
      sharesByTool[tool] = (sharesByTool[tool] || 0) + 1
      sharesByMethod[method] = (sharesByMethod[method] || 0) + 1
    })

    // Referral arrivals (people who came via ref= links)
    const referralArrivals = opencancerEvents.filter((e: { metadata?: { ref?: string } }) =>
      e.metadata?.ref && e.metadata.ref !== 'unknown'
    )
    const referralsBySource: Record<string, number> = {}
    referralArrivals.forEach((e: { metadata?: { ref?: string } }) => {
      const ref = e.metadata?.ref || 'unknown'
      referralsBySource[ref] = (referralsBySource[ref] || 0) + 1
    })
    const uniqueReferralSessions = new Set(
      referralArrivals.map((e: { session_id: string }) => e.session_id)
    ).size

    // Caregiver vs Patient ratio from profiles
    let caregiverCount = 0
    let patientCount = 0
    try {
      const { data: profileRoles } = await supabase
        .from('opencancer_profiles')
        .select('role')

      if (profileRoles) {
        caregiverCount = profileRoles.filter((p: { role: string }) => p.role === 'caregiver').length
        patientCount = profileRoles.filter((p: { role: string }) => p.role === 'patient').length
      }
    } catch (err) {
      console.error('Error fetching profile roles:', err)
    }

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalPageViews,
        uniqueSessions,
        askQuestions,
        recordsUploaded,
        checklistViews,
        trialsSearches,
        profileCreations: profilesCreatedInPeriod,
        totalProfiles: totalProfileCount,
        // Auth user counts (separate from profiles)
        totalUsers: totalUserCount,
        usersCreatedInPeriod,
        // Records engagement (from patient_activity - authoritative)
        avgRecordsPerUser: parseFloat(avgRecordsPerUser),     // all-time uploaders
        avgRecordsPerSession: parseFloat(avgRecordsPerSession), // session-based (from analytics_events)
        usersWithRecords: recordUploaders.size,               // from patient_activity (authoritative)
        sessionsWithRecords: sessionsWithRecords.size,        // all uploading sessions
        combatAnalyses: combatStats.total,
      },
      combatStats,
      // Sharing & Viral metrics
      sharingStats: {
        totalShares: shareEvents.length,
        byTool: Object.entries(sharesByTool)
          .sort((a, b) => b[1] - a[1])
          .map(([tool, count]) => ({ tool, count })),
        byMethod: Object.entries(sharesByMethod)
          .sort((a, b) => b[1] - a[1])
          .map(([method, count]) => ({ method, count })),
      },
      referralStats: {
        totalReferralArrivals: referralArrivals.length,
        uniqueReferralSessions: uniqueReferralSessions,
        bySource: Object.entries(referralsBySource)
          .sort((a, b) => b[1] - a[1])
          .map(([source, count]) => ({ source, count })),
      },
      roleBreakdown: {
        caregivers: caregiverCount,
        patients: patientCount,
        ratio: patientCount > 0 ? (caregiverCount / patientCount).toFixed(2) : '0',
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
      // Drill-down details
      drillDown: {
        questions: questionDetails,
      },
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

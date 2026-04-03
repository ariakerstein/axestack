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

  // Simple auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || 'opencancer-admin-2024'

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Get activity stats by type (all time - no date filter)
    const { data: activities, error: activitiesError } = await supabase
      .from('patient_activity')
      .select('activity_type, created_at, user_id, metadata')
      .order('created_at', { ascending: false })

    if (activitiesError) {
      console.error('Activity query error:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Count by activity type
    const activityCounts: Record<string, number> = {}
    const uniqueUsers = new Set<string>()
    const dailyActivity: Record<string, Record<string, number>> = {}

    activities?.forEach((a) => {
      // Count by type
      if (a.activity_type) {
        activityCounts[a.activity_type] = (activityCounts[a.activity_type] || 0) + 1
      }

      // Track unique users
      if (a.user_id) uniqueUsers.add(a.user_id)

      // Daily breakdown (skip if no created_at)
      if (a.created_at) {
        const date = a.created_at.split('T')[0]
        if (!dailyActivity[date]) dailyActivity[date] = {}
        if (a.activity_type) {
          dailyActivity[date][a.activity_type] = (dailyActivity[date][a.activity_type] || 0) + 1
        }
      }
    })

    // Get behavioral patterns from patient_graph_connections view
    const { data: connections, error: connectionsError } = await supabase
      .from('patient_graph_connections')
      .select('*')

    let behavioralPatterns: Array<{
      from: string
      to: string
      connection_count: number
      avg_time_hours: number
      unique_patients: number
    }> = []

    if (!connectionsError && connections) {
      behavioralPatterns = connections
        .filter(c => (c.from_activity || c.activity_a) && (c.to_activity || c.activity_b))
        .map(c => ({
          from: c.from_activity || c.activity_a || 'unknown',
          to: c.to_activity || c.activity_b || 'unknown',
          connection_count: c.connection_count || 0,
          avg_time_hours: Math.round((c.avg_time_between_hours || c.avg_hours_between || 0) * 10) / 10,
          unique_patients: c.unique_patients || 0
        }))
    }

    // Get high intent patients
    const { data: highIntent, error: highIntentError } = await supabase
      .from('high_intent_patients')
      .select('*')
      .limit(50)

    let highIntentPatients: Array<{
      user_id: string
      total_activities: number
      distinct_activity_types: number
      first_activity: string
      last_activity: string
    }> = []

    if (!highIntentError && highIntent) {
      highIntentPatients = highIntent.map(p => ({
        user_id: p.user_id?.substring(0, 8) + '...',
        total_activities: p.total_activities,
        distinct_activity_types: p.distinct_activity_types,
        first_activity: p.first_activity,
        last_activity: p.last_activity
      }))
    }

    // Activity conversion funnel
    const recordUploaders = new Set<string>()
    const askers = new Set<string>()
    const combatUsers = new Set<string>()
    const feedbackGivers = new Set<string>()

    activities?.forEach((a) => {
      if (!a.user_id) return
      if (a.activity_type === 'record_upload') recordUploaders.add(a.user_id)
      if (a.activity_type === 'ask_question') askers.add(a.user_id)
      if (a.activity_type === 'combat_run') combatUsers.add(a.user_id)
      if (a.activity_type === 'thumbs_up' || a.activity_type === 'thumbs_down') {
        feedbackGivers.add(a.user_id)
      }
    })

    // Users who did both record_upload AND ask_question
    const recordThenAsk = [...recordUploaders].filter(u => askers.has(u)).length
    // Users who did record_upload AND combat
    const recordThenCombat = [...recordUploaders].filter(u => combatUsers.has(u)).length

    // Build full funnel with drop-off rates
    const funnelSteps = [
      { name: 'Unique Users', count: uniqueUsers.size },
      { name: 'Record Upload', count: recordUploaders.size },
      { name: 'Ask Question', count: askers.size },
      { name: 'Combat Run', count: combatUsers.size },
      { name: 'Gave Feedback', count: feedbackGivers.size }
    ]

    // Calculate drop-off between each step
    const funnelWithDropoff = funnelSteps.map((step, i) => {
      const prevCount = i === 0 ? step.count : funnelSteps[i - 1].count
      const dropoffRate = prevCount > 0 ? Math.round((1 - step.count / prevCount) * 100) : 0
      const conversionRate = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0
      return {
        ...step,
        dropoffRate: i === 0 ? 0 : dropoffRate,
        conversionRate: i === 0 ? 100 : conversionRate,
        percentOfTotal: uniqueUsers.size > 0 ? Math.round((step.count / uniqueUsers.size) * 100) : 0
      }
    })

    // Calculate time-to-action metrics
    // Group activities by user with timestamps
    const userTimelines: Record<string, Array<{ type: string; time: Date }>> = {}
    activities?.forEach(a => {
      if (!a.user_id || !a.created_at || !a.activity_type) return
      if (!userTimelines[a.user_id]) userTimelines[a.user_id] = []
      userTimelines[a.user_id].push({
        type: a.activity_type,
        time: new Date(a.created_at)
      })
    })

    // Sort each user's timeline
    Object.values(userTimelines).forEach(timeline => {
      timeline.sort((a, b) => a.time.getTime() - b.time.getTime())
    })

    // Calculate average time between key actions
    const uploadToQuestion: number[] = []
    const questionToCombat: number[] = []
    const uploadToCombat: number[] = []

    Object.values(userTimelines).forEach(timeline => {
      let firstUpload: Date | undefined
      let firstQuestion: Date | undefined
      let firstCombat: Date | undefined

      timeline.forEach(event => {
        if (event.type === 'record_upload' && !firstUpload) firstUpload = event.time
        if (event.type === 'ask_question' && !firstQuestion) firstQuestion = event.time
        if (event.type === 'combat_run' && !firstCombat) firstCombat = event.time
      })

      if (firstUpload && firstQuestion) {
        const hours = (firstQuestion.getTime() - firstUpload.getTime()) / (1000 * 60 * 60)
        if (hours >= 0 && hours < 720) uploadToQuestion.push(hours) // Cap at 30 days
      }
      if (firstQuestion && firstCombat) {
        const hours = (firstCombat.getTime() - firstQuestion.getTime()) / (1000 * 60 * 60)
        if (hours >= 0 && hours < 720) questionToCombat.push(hours)
      }
      if (firstUpload && firstCombat) {
        const hours = (firstCombat.getTime() - firstUpload.getTime()) / (1000 * 60 * 60)
        if (hours >= 0 && hours < 720) uploadToCombat.push(hours)
      }
    })

    const avgTime = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null

    const timeToAction = {
      uploadToQuestion: {
        avgHours: avgTime(uploadToQuestion),
        sampleSize: uploadToQuestion.length
      },
      questionToCombat: {
        avgHours: avgTime(questionToCombat),
        sampleSize: questionToCombat.length
      },
      uploadToCombat: {
        avgHours: avgTime(uploadToCombat),
        sampleSize: uploadToCombat.length
      }
    }

    // Find users idle >24h after upload (intervention targets)
    const now = new Date()
    const idleUsers: string[] = []
    Object.entries(userTimelines).forEach(([userId, timeline]) => {
      const hasUpload = timeline.some(e => e.type === 'record_upload')
      const hasCombat = timeline.some(e => e.type === 'combat_run')
      if (hasUpload && !hasCombat) {
        const lastActivity = timeline[timeline.length - 1]
        const hoursSinceLastActivity = (now.getTime() - lastActivity.time.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastActivity > 24) {
          idleUsers.push(userId)
        }
      }
    })

    // Paths that lead to Combat
    const pathsToCombat: Record<string, number> = {}
    Object.values(userTimelines).forEach(timeline => {
      const combatIndex = timeline.findIndex(e => e.type === 'combat_run')
      if (combatIndex > 0) {
        // Get the activity right before combat
        const prevActivity = timeline[combatIndex - 1].type
        const path = `${prevActivity} → combat_run`
        pathsToCombat[path] = (pathsToCombat[path] || 0) + 1
      }
    })

    // Daily breakdown formatted
    const dailyBreakdown = Object.entries(dailyActivity)
      .map(([date, counts]) => ({
        date,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        ...counts
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Recent activities (last 20)
    const recentActivities = (activities || []).slice(0, 20).map(a => ({
      type: a.activity_type || 'unknown',
      user: a.user_id ? a.user_id.substring(0, 8) + '...' : 'anonymous',
      timestamp: a.created_at || null,
      metadata: a.metadata
    }))

    return NextResponse.json({
      period: 'All time',
      summary: {
        totalActivities: activities?.length || 0,
        uniqueUsers: uniqueUsers.size,
        activityTypes: Object.keys(activityCounts).length
      },
      activityCounts: Object.entries(activityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      funnel: {
        recordUploaders: recordUploaders.size,
        askers: askers.size,
        combatUsers: combatUsers.size,
        feedbackGivers: feedbackGivers.size,
        recordThenAsk,
        recordThenCombat
      },
      funnelSteps: funnelWithDropoff,
      timeToAction,
      idleUsersCount: idleUsers.length,
      pathsToCombat: Object.entries(pathsToCombat)
        .sort((a, b) => b[1] - a[1])
        .map(([path, count]) => ({ path, count })),
      behavioralPatterns: behavioralPatterns
        .sort((a, b) => b.connection_count - a.connection_count)
        .slice(0, 15),
      highIntentPatients,
      dailyBreakdown: dailyBreakdown.slice(0, 14), // Last 2 weeks
      recentActivities
    })
  } catch (err) {
    console.error('Activity graph error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

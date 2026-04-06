import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')

  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''
  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // If no patient specified, return list of patients with entity counts
    if (!patientId) {
      // Get all patients who have entities
      const { data: entities } = await supabase
        .from('patient_entities')
        .select('user_id, entity_type, created_at')
        .not('user_id', 'is', null)

      // Group by patient
      const patientStats: Record<string, {
        entityCount: number
        types: Set<string>
        firstSeen: string | null
        lastSeen: string | null
      }> = {}

      entities?.forEach(e => {
        if (!e.user_id) return
        if (!patientStats[e.user_id]) {
          patientStats[e.user_id] = {
            entityCount: 0,
            types: new Set(),
            firstSeen: null,
            lastSeen: null
          }
        }
        patientStats[e.user_id].entityCount++
        if (e.entity_type) patientStats[e.user_id].types.add(e.entity_type)
        if (e.created_at) {
          if (!patientStats[e.user_id].firstSeen || e.created_at < patientStats[e.user_id].firstSeen!) {
            patientStats[e.user_id].firstSeen = e.created_at
          }
          if (!patientStats[e.user_id].lastSeen || e.created_at > patientStats[e.user_id].lastSeen!) {
            patientStats[e.user_id].lastSeen = e.created_at
          }
        }
      })

      // Get emails for patients
      const patientIds = Object.keys(patientStats)
      let emailMap: Record<string, string> = {}

      if (patientIds.length > 0) {
        try {
          const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
          if (authData?.users) {
            authData.users.forEach(u => {
              if (patientIds.includes(u.id)) {
                emailMap[u.id] = u.email || 'Unknown'
              }
            })
          }
        } catch (err) {
          console.error('Error fetching user emails:', err)
        }
      }

      const patients = Object.entries(patientStats)
        .map(([id, stats]) => ({
          id,
          email: emailMap[id] || id.substring(0, 8) + '...',
          entityCount: stats.entityCount,
          entityTypes: Array.from(stats.types),
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen
        }))
        .sort((a, b) => b.entityCount - a.entityCount)

      return NextResponse.json({
        patients,
        totalPatients: patients.length,
        totalEntities: entities?.length || 0
      })
    }

    // Get specific patient's timeline
    const { data: patientEntities, error: entitiesError } = await supabase
      .from('patient_entities')
      .select('*')
      .eq('user_id', patientId)
      .order('created_at', { ascending: true })

    if (entitiesError) {
      console.error('Error fetching patient entities:', entitiesError)
      return NextResponse.json({ error: 'Failed to fetch patient data' }, { status: 500 })
    }

    // Get patient's activities for context
    const { data: activities } = await supabase
      .from('patient_activity')
      .select('activity_type, created_at, metadata')
      .eq('user_id', patientId)
      .order('created_at', { ascending: true })

    // Get patient's records
    const { data: records } = await supabase
      .from('patient_records')
      .select('id, file_name, file_type, created_at, metadata')
      .eq('user_id', patientId)
      .order('created_at', { ascending: true })

    // Get patient email
    let patientEmail = patientId.substring(0, 8) + '...'
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const user = authData?.users?.find(u => u.id === patientId)
      if (user?.email) patientEmail = user.email
    } catch (err) {
      console.error('Error fetching user email:', err)
    }

    // Build timeline events
    interface TimelineEvent {
      timestamp: string
      type: 'entity' | 'activity' | 'record'
      category: string
      value: string
      source?: string
      metadata?: Record<string, unknown>
    }

    const timeline: TimelineEvent[] = []

    // Add entities to timeline
    patientEntities?.forEach(e => {
      timeline.push({
        timestamp: e.created_at || new Date().toISOString(),
        type: 'entity',
        category: e.entity_type || 'unknown',
        value: e.entity_value || '',
        source: e.source_record_id ? `Record: ${e.source_record_id.substring(0, 8)}` : undefined,
        metadata: e.metadata as Record<string, unknown> | undefined
      })
    })

    // Add activities to timeline
    activities?.forEach(a => {
      timeline.push({
        timestamp: a.created_at || new Date().toISOString(),
        type: 'activity',
        category: a.activity_type || 'unknown',
        value: a.activity_type || '',
        metadata: a.metadata as Record<string, unknown> | undefined
      })
    })

    // Add records to timeline
    records?.forEach(r => {
      timeline.push({
        timestamp: r.created_at || new Date().toISOString(),
        type: 'record',
        category: 'upload',
        value: r.file_name || 'Unknown file',
        metadata: { fileType: r.file_type, ...(r.metadata as Record<string, unknown> || {}) }
      })
    })

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Group entities by type for summary
    const entitySummary: Record<string, string[]> = {}
    patientEntities?.forEach(e => {
      const type = e.entity_type || 'other'
      if (!entitySummary[type]) entitySummary[type] = []
      if (!entitySummary[type].includes(e.entity_value)) {
        entitySummary[type].push(e.entity_value)
      }
    })

    return NextResponse.json({
      patientId,
      patientEmail,
      timeline,
      entitySummary,
      stats: {
        totalEntities: patientEntities?.length || 0,
        totalActivities: activities?.length || 0,
        totalRecords: records?.length || 0,
        entityTypes: Object.keys(entitySummary),
        firstEvent: timeline[0]?.timestamp,
        lastEvent: timeline[timeline.length - 1]?.timestamp
      }
    })
  } catch (err) {
    console.error('Patient timeline error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key)
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || ''

  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('opencancer_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Profiles query error:', error)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    const allProfiles = profiles || []

    // Calculate aggregates
    const cancerTypes: Record<string, number> = {}
    const stages: Record<string, number> = {}
    const roles: Record<string, number> = { patient: 0, caregiver: 0 }
    const locations: Record<string, number> = {}

    allProfiles.forEach((p) => {
      // Cancer types
      cancerTypes[p.cancer_type] = (cancerTypes[p.cancer_type] || 0) + 1

      // Stages
      if (p.stage) {
        stages[p.stage] = (stages[p.stage] || 0) + 1
      }

      // Roles
      roles[p.role] = (roles[p.role] || 0) + 1

      // Locations
      if (p.location) {
        locations[p.location] = (locations[p.location] || 0) + 1
      }
    })

    // Sort aggregates by count
    const sortByCount = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      total: allProfiles.length,
      aggregates: {
        cancerTypes: sortByCount(cancerTypes),
        stages: sortByCount(stages),
        roles: sortByCount(roles),
        locations: sortByCount(locations),
      },
      profiles: allProfiles.map((p) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        role: p.role,
        cancerType: p.cancer_type,
        stage: p.stage,
        location: p.location,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    })
  } catch (err) {
    console.error('Profiles error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

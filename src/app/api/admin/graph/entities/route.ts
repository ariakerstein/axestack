import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')

  let query = supabase
    .from('patient_entities')
    .select('*')
    .order('created_at', { ascending: false })

  // Filter by patient if specified
  if (patientId) {
    query = query.eq('user_id', patientId)
  }

  const { data, error } = await query.limit(1000)

  if (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get the real count (not limited to 1000)
  let countQuery = supabase
    .from('patient_entities')
    .select('*', { count: 'exact', head: true })

  if (patientId) {
    countQuery = countQuery.eq('user_id', patientId)
  }

  const { count: totalCount } = await countQuery

  // Get patient email if filtering by patient
  let patientEmail: string | null = null
  if (patientId) {
    try {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const user = authData?.users?.find(u => u.id === patientId)
      patientEmail = user?.email || null
    } catch {
      // Ignore auth errors
    }
  }

  return NextResponse.json({
    entities: data,
    totalCount: totalCount || data?.length || 0,
    patientId,
    patientEmail
  })
}

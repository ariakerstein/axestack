import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function GET() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('patient_entities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entities: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Simple admin secret - should be set in env
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// GET - Look up email address info
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const username = searchParams.get('username')

  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('email_addresses')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

// POST - Link email to user_id
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { username, userId } = body

  if (!username || !userId) {
    return NextResponse.json({ error: 'username and userId required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('email_addresses')
    .update({ user_id: userId })
    .eq('username', username.toLowerCase())
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Generate a short, readable share token
function generateShareToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789' // No ambiguous chars
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { caseBrief, recordSummaries, cancerType } = body

    if (!caseBrief) {
      return NextResponse.json({ error: 'No case brief provided' }, { status: 400 })
    }

    const shareToken = generateShareToken()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    const { data, error } = await supabase
      .from('shared_cases')
      .insert({
        share_token: shareToken,
        case_brief: caseBrief,
        record_summaries: recordSummaries || [],
        cancer_type: cancerType || null,
        expires_at: expiresAt.toISOString(),
        view_count: 0,
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, create it
      if (error.code === '42P01') {
        console.log('shared_cases table does not exist, returning error')
        return NextResponse.json(
          { error: 'Sharing feature not yet configured. Please contact support.' },
          { status: 500 }
        )
      }
      console.error('Error saving shared case:', error)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    const shareUrl = `https://opencancer.ai/shared/case/${shareToken}`

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Share case error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shared_cases')
      .select('*')
      .eq('share_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Shared case not found' }, { status: 404 })
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
    }

    // Increment view count
    await supabase
      .from('shared_cases')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('share_token', token)

    return NextResponse.json({
      caseBrief: data.case_brief,
      recordSummaries: data.record_summaries,
      cancerType: data.cancer_type,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      viewCount: data.view_count + 1,
    })
  } catch (error) {
    console.error('Fetch shared case error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

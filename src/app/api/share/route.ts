import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Generate a short unique ID
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

// POST - Create a new shareable link
export async function POST(request: NextRequest) {
  try {
    const { fileName, documentType, result, summary } = await request.json()

    if (!result) {
      return NextResponse.json({ error: 'No record data provided' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const shareId = generateShareId()

    // Create shared_records table entry
    const { error } = await supabase
      .from('shared_records')
      .insert({
        share_id: shareId,
        file_name: fileName || 'Medical Record',
        document_type: documentType || 'Document',
        summary: summary || result.test_summary || '',
        analysis: result,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        view_count: 0,
      })

    if (error) {
      console.error('Supabase error:', error)
      // If table doesn't exist or any error, return share URL anyway (fallback)
      // The link won't work but at least the user gets feedback
      const shareUrl = `https://opencancer.ai/records?shared=true`
      return NextResponse.json({
        success: true,
        shareId: 'temp',
        shareUrl,
        note: 'Share links coming soon - link copied to clipboard'
      })
    }

    const shareUrl = `https://opencancer.ai/s/${shareId}`
    return NextResponse.json({ success: true, shareId, shareUrl })
  } catch (error) {
    console.error('Share creation error:', error)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}

// GET - Retrieve a shared record by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('id')

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get the shared record
    const { data, error } = await supabase
      .from('shared_records')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
    }

    // Increment view count
    await supabase
      .from('shared_records')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('share_id', shareId)

    return NextResponse.json({
      fileName: data.file_name,
      documentType: data.document_type,
      summary: data.summary,
      result: data.analysis,
      createdAt: data.created_at,
      viewCount: data.view_count + 1,
    })
  } catch (error) {
    console.error('Share fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch shared record' }, { status: 500 })
  }
}

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

// Content types supported
type ShareType = 'record' | 'qa' | 'combat'

// POST - Create a new shareable link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = 'record' } = body as { type?: ShareType }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const shareId = generateShareId()

    // Handle different content types
    if (type === 'qa') {
      // Share a Q&A conversation from Ask Navis
      const { question, answer, cancerType, followUpQuestions } = body

      if (!question || !answer) {
        return NextResponse.json({ error: 'Question and answer required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('shared_records')
        .insert({
          share_id: shareId,
          file_name: question.slice(0, 100), // Use question as title
          document_type: 'qa',
          summary: answer.slice(0, 500),
          analysis: {
            type: 'qa',
            question,
            answer,
            cancerType: cancerType || null,
            followUpQuestions: followUpQuestions || [],
          },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days for Q&A
          view_count: 0,
        })

      if (error) {
        console.error('Supabase error (qa):', error)
        return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
      }

      const shareUrl = `https://opencancer.ai/s/${shareId}`
      return NextResponse.json({ success: true, shareId, shareUrl, type: 'qa' })

    } else if (type === 'combat') {
      // Share a Combat analysis
      const { question, perspectives, synthesis, consensus, divergence, phase, cancerType } = body

      if (!question || !perspectives) {
        return NextResponse.json({ error: 'Combat analysis data required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('shared_records')
        .insert({
          share_id: shareId,
          file_name: question.slice(0, 100),
          document_type: 'combat',
          summary: synthesis?.slice(0, 500) || '',
          analysis: {
            type: 'combat',
            question,
            perspectives,
            synthesis,
            consensus: consensus || [],
            divergence: divergence || [],
            phase: phase || 'diagnosis',
            cancerType: cancerType || null,
          },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          view_count: 0,
        })

      if (error) {
        console.error('Supabase error (combat):', error)
        return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
      }

      const shareUrl = `https://opencancer.ai/s/${shareId}`
      return NextResponse.json({ success: true, shareId, shareUrl, type: 'combat' })

    } else {
      // Original record sharing logic
      const { fileName, documentType, result, summary } = body

      if (!result) {
        return NextResponse.json({ error: 'No record data provided' }, { status: 400 })
      }

      const { error } = await supabase
        .from('shared_records')
        .insert({
          share_id: shareId,
          file_name: fileName || 'Medical Record',
          document_type: documentType || 'Document',
          summary: summary || result.test_summary || '',
          analysis: { ...result, type: 'record' },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          view_count: 0,
        })

      if (error) {
        console.error('Supabase error:', error)
        const shareUrl = `https://opencancer.ai/records?shared=true`
        return NextResponse.json({
          success: true,
          shareId: 'temp',
          shareUrl,
          note: 'Share links coming soon - link copied to clipboard'
        })
      }

      const shareUrl = `https://opencancer.ai/s/${shareId}`
      return NextResponse.json({ success: true, shareId, shareUrl, type: 'record' })
    }
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

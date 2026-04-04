import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Navis Supabase (reuse existing infrastructure)
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

export async function POST(request: NextRequest) {
  try {
    const { fileName, sessionId, contentType } = await request.json()

    if (!fileName || !sessionId) {
      return NextResponse.json(
        { error: 'fileName and sessionId are required' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `opencancer/${sessionId}/${timestamp}_${safeName}`

    // Create a signed URL for uploading (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('medical-documents')
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error('Failed to create signed upload URL:', error)
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      storagePath: filePath,
    })

  } catch (error) {
    console.error('Signed URL API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create signed URL: ${errorMessage}` },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Helper to verify auth token and get user ID securely
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimit = checkRateLimit(`records-view:${clientId}`, RATE_LIMITS.standard)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) } }
      )
    }

    // Require authentication
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storagePath = searchParams.get('path')

    if (!storagePath) {
      return NextResponse.json({ error: 'Storage path required' }, { status: 400 })
    }

    // Security: Verify the file path belongs to this user
    // File paths are structured as: opencancer/{userId}/{timestamp}_{filename}
    const decodedPath = decodeURIComponent(storagePath)
    if (!decodedPath.includes(userId)) {
      console.warn(`User ${userId} attempted to access file: ${decodedPath}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Generate a signed URL that expires in 10 minutes (reduced from 1 hour)
    const { data, error } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(storagePath, 600) // 10 minutes expiry

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('View record error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export interface ReceivedEmail {
  id: string
  from_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  received_at: string
  processed: boolean
  attachments: {
    id: string
    filename: string
    content_type: string | null
    size_bytes: number | null
    storage_path: string | null
    processed: boolean
  }[]
}

// GET - Fetch received emails for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')
  const emailAddressId = searchParams.get('emailAddressId')

  if (!sessionId && !userId && !emailAddressId) {
    return NextResponse.json({ error: 'sessionId, userId, or emailAddressId required' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    // First, find the email address(es) for this user/session
    let emailAddressIds: string[] = []

    if (emailAddressId) {
      emailAddressIds = [emailAddressId]
    } else {
      let query = supabase
        .from('email_addresses')
        .select('id')
        .eq('is_active', true)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data: addresses, error: addressError } = await query

      if (addressError) {
        console.error('Error fetching email addresses:', addressError)
        return NextResponse.json({ error: 'Failed to fetch email addresses' }, { status: 500 })
      }

      emailAddressIds = addresses?.map(a => a.id) || []
    }

    if (emailAddressIds.length === 0) {
      return NextResponse.json({ emails: [], message: 'No email addresses found' })
    }

    // Fetch received emails for these addresses
    const { data: emails, error: emailError } = await supabase
      .from('received_emails')
      .select(`
        id,
        from_address,
        subject,
        body_text,
        body_html,
        received_at,
        processed,
        email_attachments (
          id,
          filename,
          content_type,
          size_bytes,
          storage_path,
          processed
        )
      `)
      .in('email_address_id', emailAddressIds)
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailError) {
      console.error('Error fetching emails:', emailError)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    // Transform the data
    const transformedEmails: ReceivedEmail[] = (emails || []).map(email => ({
      id: email.id,
      from_address: email.from_address,
      subject: email.subject,
      body_text: email.body_text,
      body_html: email.body_html,
      received_at: email.received_at,
      processed: email.processed,
      attachments: email.email_attachments || []
    }))

    return NextResponse.json({ emails: transformedEmails })
  } catch (err) {
    console.error('Error in received emails API:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

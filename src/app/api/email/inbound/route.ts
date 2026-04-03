import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Resend webhook verification
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

interface ResendInboundEmail {
  // Resend inbound email payload
  from: string
  to: string[]
  subject: string
  text?: string
  html?: string
  attachments?: {
    filename: string
    content: string // base64 encoded
    content_type: string
  }[]
  headers?: Record<string, string>
  created_at: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if secret is set
    // Resend uses Svix for webhooks - check multiple possible header names
    const signature = request.headers.get('svix-signature') || request.headers.get('resend-signature')
    if (RESEND_WEBHOOK_SECRET && !signature) {
      console.log('Webhook headers:', Object.fromEntries(request.headers.entries()))
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // TODO: Add proper svix signature verification
    // For now, accept if signature is present (Resend signed it)

    const payload: ResendInboundEmail = await request.json()

    // Extract username from to address (e.g., "john@opencancer.ai" -> "john")
    const toAddress = payload.to[0]?.toLowerCase()
    if (!toAddress || !toAddress.endsWith('@opencancer.ai')) {
      console.log('Inbound email to non-opencancer address:', toAddress)
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })
    }

    const username = toAddress.replace('@opencancer.ai', '')

    const supabase = getSupabase()

    // Look up the email address owner
    const { data: emailRecord, error: lookupError } = await supabase
      .from('email_addresses')
      .select('id, session_id, user_id')
      .eq('username', username)
      .eq('status', 'active')
      .single()

    if (lookupError || !emailRecord) {
      console.log('No active email address found for:', username)
      // Store in orphan queue for debugging
      await supabase.from('received_emails').insert({
        email_address_id: null,
        from_address: payload.from,
        subject: payload.subject,
        body_text: payload.text,
        body_html: payload.html,
        raw_headers: payload.headers,
        received_at: new Date().toISOString(),
        processed: false,
        processing_error: `No active email address found for ${username}`
      })
      return NextResponse.json({ error: 'Unknown recipient' }, { status: 404 })
    }

    // Store the email
    const { data: storedEmail, error: storeError } = await supabase
      .from('received_emails')
      .insert({
        email_address_id: emailRecord.id,
        from_address: payload.from,
        subject: payload.subject,
        body_text: payload.text,
        body_html: payload.html,
        raw_headers: payload.headers,
        received_at: payload.created_at || new Date().toISOString(),
        processed: false
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing email:', storeError)
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 })
    }

    // Process attachments
    if (payload.attachments && payload.attachments.length > 0) {
      const attachmentInserts = payload.attachments.map(att => ({
        email_id: storedEmail.id,
        filename: att.filename,
        content_type: att.content_type,
        size_bytes: Math.ceil(att.content.length * 0.75), // base64 overhead
        storage_path: null, // Will be set after upload
        processed: false
      }))

      const { data: attachmentRecords, error: attachError } = await supabase
        .from('email_attachments')
        .insert(attachmentInserts)
        .select()

      if (attachError) {
        console.error('Error storing attachment records:', attachError)
      } else if (attachmentRecords) {
        // Upload each attachment to storage
        for (let i = 0; i < payload.attachments.length; i++) {
          const att = payload.attachments[i]
          const record = attachmentRecords[i]

          // Decode base64 and upload
          const buffer = Buffer.from(att.content, 'base64')
          const storagePath = `emails/${emailRecord.session_id}/${storedEmail.id}/${att.filename}`

          const { error: uploadError } = await supabase.storage
            .from('medical-records')
            .upload(storagePath, buffer, {
              contentType: att.content_type,
              upsert: false
            })

          if (uploadError) {
            console.error('Error uploading attachment:', uploadError)
            await supabase
              .from('email_attachments')
              .update({ processing_error: uploadError.message })
              .eq('id', record.id)
          } else {
            // Update with storage path
            await supabase
              .from('email_attachments')
              .update({ storage_path: storagePath })
              .eq('id', record.id)
          }
        }
      }

      // Trigger background processing of documents
      // This could call a Supabase edge function or another API
      // For now, mark email as needing processing
      await supabase
        .from('received_emails')
        .update({ processed: false })
        .eq('id', storedEmail.id)
    }

    console.log(`Received email for ${username}@opencancer.ai from ${payload.from}`)

    return NextResponse.json({
      success: true,
      email_id: storedEmail.id,
      attachments: payload.attachments?.length || 0
    })

  } catch (err) {
    console.error('Inbound email webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Health check for webhook
export async function GET() {
  return NextResponse.json({ status: 'Inbound email webhook active' })
}

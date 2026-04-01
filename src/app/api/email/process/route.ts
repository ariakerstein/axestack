import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Process unprocessed email attachments and add to vault
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Get unprocessed attachments
    const { data: attachments, error: fetchError } = await supabase
      .from('email_attachments')
      .select(`
        *,
        email:received_emails(
          email_address_id,
          from_address,
          subject,
          email_address:email_addresses(session_id, user_id)
        )
      `)
      .eq('processed', false)
      .not('storage_path', 'is', null)
      .limit(10)

    if (fetchError) {
      console.error('Error fetching attachments:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
    }

    if (!attachments || attachments.length === 0) {
      return NextResponse.json({ message: 'No attachments to process', processed: 0 })
    }

    let processedCount = 0
    const results: Array<{ id: string; status: string; error?: string }> = []

    for (const attachment of attachments) {
      try {
        const sessionId = attachment.email?.email_address?.session_id

        if (!sessionId) {
          await supabase
            .from('email_attachments')
            .update({
              processed: true,
              processing_error: 'No session ID found'
            })
            .eq('id', attachment.id)
          results.push({ id: attachment.id, status: 'error', error: 'No session ID' })
          continue
        }

        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('medical-records')
          .download(attachment.storage_path)

        if (downloadError || !fileData) {
          await supabase
            .from('email_attachments')
            .update({
              processed: true,
              processing_error: downloadError?.message || 'Download failed'
            })
            .eq('id', attachment.id)
          results.push({ id: attachment.id, status: 'error', error: 'Download failed' })
          continue
        }

        // Convert blob to base64 for translation API
        const arrayBuffer = await fileData.arrayBuffer()
        const base64Content = Buffer.from(arrayBuffer).toString('base64')

        // Call the translate API
        const translateResponse = await fetch(`${SUPABASE_URL}/functions/v1/translate-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            file_content: base64Content,
            file_name: attachment.filename,
            content_type: attachment.content_type
          })
        })

        if (!translateResponse.ok) {
          const errorText = await translateResponse.text()
          await supabase
            .from('email_attachments')
            .update({
              processed: true,
              processing_error: `Translation failed: ${errorText}`
            })
            .eq('id', attachment.id)
          results.push({ id: attachment.id, status: 'error', error: 'Translation failed' })
          continue
        }

        const translationResult = await translateResponse.json()

        // Save to records vault
        const { error: saveError } = await supabase
          .from('medical_records')
          .insert({
            session_id: sessionId,
            user_id: attachment.email?.email_address?.user_id,
            file_name: attachment.filename,
            file_type: attachment.content_type,
            file_size: attachment.size_bytes,
            storage_path: attachment.storage_path,
            result: translationResult,
            source: 'email',
            source_email: attachment.email?.from_address,
            source_subject: attachment.email?.subject
          })

        if (saveError) {
          await supabase
            .from('email_attachments')
            .update({
              processed: true,
              processing_error: `Save failed: ${saveError.message}`
            })
            .eq('id', attachment.id)
          results.push({ id: attachment.id, status: 'error', error: 'Save failed' })
          continue
        }

        // Mark as processed
        await supabase
          .from('email_attachments')
          .update({ processed: true })
          .eq('id', attachment.id)

        // Also mark the parent email as processed if all attachments done
        const { count: remainingCount } = await supabase
          .from('email_attachments')
          .select('*', { count: 'exact', head: true })
          .eq('email_id', attachment.email_id)
          .eq('processed', false)

        if (remainingCount === 0) {
          await supabase
            .from('received_emails')
            .update({ processed: true })
            .eq('id', attachment.email_id)
        }

        processedCount++
        results.push({ id: attachment.id, status: 'success' })

      } catch (err) {
        console.error('Error processing attachment:', attachment.id, err)
        await supabase
          .from('email_attachments')
          .update({
            processed: true,
            processing_error: String(err)
          })
          .eq('id', attachment.id)
        results.push({ id: attachment.id, status: 'error', error: String(err) })
      }
    }

    return NextResponse.json({
      processed: processedCount,
      total: attachments.length,
      results
    })

  } catch (err) {
    console.error('Email processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// Check processing status
export async function GET() {
  const supabase = getSupabase()

  const { count: unprocessed } = await supabase
    .from('email_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('processed', false)

  return NextResponse.json({
    status: 'Email processing endpoint',
    unprocessed_attachments: unprocessed || 0
  })
}

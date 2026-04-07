import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, cancerType, message } = body

    // Save to database
    const supabase = getSupabase()
    const { error } = await supabase
      .from('lifestyle_inquiries')
      .insert({
        name,
        email,
        phone,
        cancer_type: cancerType,
        message,
        source: 'opencancer.ai',
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to save inquiry:', error)
      // Don't fail the request - still send email
    }

    // Send notification email to CCLM (you'd configure this)
    // For now, we'll just log it
    console.log('Lifestyle inquiry received:', { name, email, cancerType })

    // TODO: Send email notification to CCLM team
    // await sendEmail({
    //   to: 'info@cancerlifestylemgmt.com',
    //   subject: `New Inquiry from ${name} via opencancer.ai`,
    //   body: `...`
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lifestyle inquiry error:', error)
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    )
  }
}

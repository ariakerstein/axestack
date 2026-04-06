import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

// For now, send all consultations to this email for testing
const EXPERT_EMAIL = 'ariakerstein@gmail.com'

// Initialize Resend
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

interface ConsultationRequest {
  userId: string
  userEmail: string
  expertId: string
  expertName: string
  question: string
  signature: string
  records: Array<{
    id: string
    fileName: string
    documentType: string
    result: any
  }>
  combatResult?: {
    question: string
    synthesis: string
    perspectives: Array<{
      id: string
      name: string
      response: string
    }>
    consensus?: string[]
    divergence?: string[]
  }
  includePatientBrief: boolean
  includeCombatAnalysis: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ConsultationRequest = await request.json()

    const {
      userId,
      userEmail,
      expertId,
      expertName,
      question,
      signature,
      records,
      combatResult,
      includePatientBrief,
      includeCombatAnalysis
    } = body

    if (!userId || !expertId || !records) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check Resend is configured first
    const resend = getResend()
    if (!resend) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Save consultation to database
    const consultationData = {
      user_id: userId,
      user_email: userEmail,
      expert_id: expertId,
      expert_name: expertName,
      question: question || 'Please review my case.',
      signature: signature,
      records_count: records.length,
      include_combat_analysis: includeCombatAnalysis,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const { data: consultation, error: dbError } = await supabase
      .from('expert_consultations')
      .insert(consultationData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue anyway - email is more important
    }

    // Build email content
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opencancer.ai'

    // Format records for email
    const recordsSummary = records.map(r => {
      const result = r.result || {}
      return `
### ${r.fileName}
**Type:** ${r.documentType || 'Unknown'}
**Date:** ${result.date_of_service || 'Not specified'}
**Provider:** ${result.provider || 'Not specified'}
**Institution:** ${result.institution || 'Not specified'}

**Summary:** ${result.summary || result.plain_english_summary || 'No summary available'}

${result.diagnosis ? `**Diagnosis:** ${result.diagnosis}` : ''}
${result.key_findings ? `**Key Findings:** ${Array.isArray(result.key_findings) ? result.key_findings.join(', ') : result.key_findings}` : ''}
`
    }).join('\n---\n')

    // Format combat analysis
    let combatSummary = ''
    if (includeCombatAnalysis && combatResult) {
      const perspectivesSummary = combatResult.perspectives?.map(p =>
        `**${p.name}:** ${p.response?.substring(0, 500)}${p.response?.length > 500 ? '...' : ''}`
      ).join('\n\n') || ''

      combatSummary = `
## Combat Analysis (5 AI Perspectives)

**Question Analyzed:** ${combatResult.question}

### Synthesis
${combatResult.synthesis}

${combatResult.consensus?.length ? `### Areas of Consensus\n${combatResult.consensus.map(c => `- ${c}`).join('\n')}` : ''}

${combatResult.divergence?.length ? `### Points of Divergence\n${combatResult.divergence.map(d => `- ${d}`).join('\n')}` : ''}

### Individual Perspectives
${perspectivesSummary}
`
    }

    // Build HTML email
    const subject = `Expert Consultation Request: ${expertName} - ${records.length} Records`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #C66B4A; border-bottom: 2px solid #C66B4A; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #6b7280; }
    .section { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .highlight { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .record { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
    .meta { color: #6b7280; font-size: 14px; }
    pre { background: #1f2937; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>🏥 Expert Consultation Request</h1>

  <div class="section">
    <p><strong>Expert:</strong> ${expertName}</p>
    <p><strong>Patient Email:</strong> ${userEmail}</p>
    <p><strong>Signature:</strong> ${signature}</p>
    <p><strong>Records Included:</strong> ${records.length}</p>
    <p><strong>Combat Analysis:</strong> ${includeCombatAnalysis ? 'Yes' : 'No'}</p>
    <p class="meta">Submitted: ${new Date().toLocaleString()}</p>
  </div>

  <h2>Patient's Question</h2>
  <div class="highlight">
    ${question || 'Please review my case and Combat analysis.'}
  </div>

  ${includeCombatAnalysis && combatResult ? `
  <h2>🗡️ Combat Analysis</h2>
  <div class="section">
    <p><strong>Question Analyzed:</strong> ${combatResult.question}</p>

    <h3>Synthesis</h3>
    <p>${combatResult.synthesis}</p>

    ${combatResult.consensus?.length ? `
    <h3>Areas of Consensus</h3>
    <ul>${combatResult.consensus.map(c => `<li>${c}</li>`).join('')}</ul>
    ` : ''}

    ${combatResult.divergence?.length ? `
    <h3>Points of Divergence</h3>
    <ul>${combatResult.divergence.map(d => `<li>${d}</li>`).join('')}</ul>
    ` : ''}

    <h3>Individual Perspectives</h3>
    ${combatResult.perspectives?.map(p => `
    <div class="record">
      <h4>${p.name}</h4>
      <p>${p.response?.substring(0, 1000)}${(p.response?.length || 0) > 1000 ? '...' : ''}</p>
    </div>
    `).join('') || ''}
  </div>
  ` : ''}

  <h2>📋 Medical Records (${records.length})</h2>
  ${records.map(r => {
    const result = r.result || {}
    return `
    <div class="record">
      <h3>${r.fileName}</h3>
      <p class="meta">${r.documentType || 'Document'} | ${result.date_of_service || 'Date not specified'}</p>
      ${result.provider ? `<p><strong>Provider:</strong> ${result.provider}</p>` : ''}
      ${result.institution ? `<p><strong>Institution:</strong> ${result.institution}</p>` : ''}
      ${result.diagnosis ? `<p><strong>Diagnosis:</strong> ${result.diagnosis}</p>` : ''}
      <p><strong>Summary:</strong> ${result.summary || result.plain_english_summary || 'No summary available'}</p>
      ${result.key_findings ? `<p><strong>Key Findings:</strong> ${Array.isArray(result.key_findings) ? result.key_findings.join(', ') : result.key_findings}</p>` : ''}

      <details>
        <summary style="cursor: pointer; color: #6b7280;">View Full Record Data</summary>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
    `
  }).join('')}

  <hr>
  <p class="meta">
    This consultation request was submitted via <a href="${appUrl}">opencancer.ai</a><br>
    Consultation ID: ${consultation?.id || 'pending'}
  </p>
</body>
</html>`

    const text = `
EXPERT CONSULTATION REQUEST
===========================

Expert: ${expertName}
Patient Email: ${userEmail}
Signature: ${signature}
Records: ${records.length}
Submitted: ${new Date().toLocaleString()}

PATIENT'S QUESTION:
${question || 'Please review my case and Combat analysis.'}

${combatSummary}

MEDICAL RECORDS:
${recordsSummary}

---
Submitted via opencancer.ai
Consultation ID: ${consultation?.id || 'pending'}
`

    // Send email via Resend (resend was already validated at start of function)
    try {
      const emailResult = await resend.emails.send({
        from: 'opencancer.ai <hello@opencancer.ai>',
        to: [EXPERT_EMAIL],
        replyTo: userEmail,
        subject: subject,
        html: html,
        text: text,
      })

      if (emailResult.error) {
        console.error('Email send failed:', emailResult.error)
        return NextResponse.json(
          { error: `Email failed: ${emailResult.error.message}` },
          { status: 500 }
        )
      }

      console.log('Consultation email sent:', emailResult.data?.id)
    } catch (emailError: any) {
      console.error('Email exception:', emailError)
      return NextResponse.json(
        { error: `Email error: ${emailError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Update consultation status
    if (consultation?.id) {
      await supabase
        .from('expert_consultations')
        .update({ status: 'sent', email_sent_at: new Date().toISOString() })
        .eq('id', consultation.id)
    }

    return NextResponse.json({
      success: true,
      consultationId: consultation?.id,
      message: 'Consultation request sent successfully',
    })

  } catch (error: unknown) {
    console.error('Error submitting consultation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit consultation' },
      { status: 500 }
    )
  }
}

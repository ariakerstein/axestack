import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

interface SendReportRequest {
  recipientEmail: string
  recipientName?: string
  senderName?: string
  reportType: 'single_record' | 'case_brief'
  content: {
    // For single record
    fileName?: string
    documentType?: string
    dateOfService?: string
    provider?: string
    institution?: string
    diagnosis?: string
    summary?: string
    questionsForDoctor?: string
    labResults?: string
    nextSteps?: string
    // For case brief
    bottomLine?: string
    keyFindings?: string[]
    gaps?: string[]
    questionsForDoctorList?: string[]
    timeline?: Array<{ date: string; event: string; source: string }>
    cancerSummary?: {
      type: string
      stage: string
      biomarkers: string[]
      treatments: string[]
    }
    recordCount?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SendReportRequest = await request.json()

    const { recipientEmail, recipientName, senderName, reportType, content } = body

    if (!recipientEmail || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opencancer.ai'
    const fromName = senderName || 'Someone'
    const toName = recipientName || 'there'

    let subject: string
    let html: string
    let text: string

    if (reportType === 'single_record') {
      subject = `Medical Record Summary: ${content.fileName || 'Document'}`

      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #0f172a; font-size: 24px; margin: 0;">
        <span style="background: linear-gradient(to right, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">opencancer</span><span style="color: #94a3b8;">.ai</span>
      </h1>
    </div>

    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
        Hi ${toName},
      </p>
      <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
        ${fromName} shared a medical record summary with you.
      </p>

      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #7c3aed; font-size: 18px; margin: 0 0 4px;">${content.fileName || 'Medical Document'}</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">${content.documentType || 'Document'} | ${content.dateOfService || 'Date not specified'}</p>

        ${content.provider ? `<p style="color: #374151; font-size: 14px; margin: 0 0 4px;"><strong>Provider:</strong> ${content.provider}</p>` : ''}
        ${content.institution ? `<p style="color: #374151; font-size: 14px; margin: 0 0 16px;"><strong>Institution:</strong> ${content.institution}</p>` : ''}
      </div>

      ${content.diagnosis ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Diagnosis</h3>
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">${content.diagnosis}</p>
      </div>
      ` : ''}

      ${content.summary ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Summary</h3>
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">${content.summary}</p>
      </div>
      ` : ''}

      ${content.questionsForDoctor ? `
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Questions to Ask Doctor</h3>
        <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0;">${content.questionsForDoctor}</p>
      </div>
      ` : ''}

      ${content.labResults ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Key Lab Results</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${content.labResults}</p>
      </div>
      ` : ''}

      ${content.nextSteps ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Next Steps</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">${content.nextSteps}</p>
      </div>
      ` : ''}

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          This summary was generated by <a href="${appUrl}" style="color: #7c3aed;">opencancer.ai</a> to help understand medical records. Always discuss results with a healthcare provider.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

      text = `
MEDICAL RECORD SUMMARY
Shared by ${fromName}

Document: ${content.fileName || 'Medical Document'}
Type: ${content.documentType || 'Document'}
Date: ${content.dateOfService || 'Not specified'}
${content.provider ? `Provider: ${content.provider}` : ''}
${content.institution ? `Institution: ${content.institution}` : ''}

${content.diagnosis ? `DIAGNOSIS:\n${content.diagnosis}\n` : ''}
${content.summary ? `SUMMARY:\n${content.summary}\n` : ''}
${content.questionsForDoctor ? `QUESTIONS TO ASK DOCTOR:\n${content.questionsForDoctor}\n` : ''}
${content.labResults ? `KEY LAB RESULTS:\n${content.labResults}\n` : ''}
${content.nextSteps ? `NEXT STEPS:\n${content.nextSteps}\n` : ''}

---
Generated by opencancer.ai. Always discuss with your healthcare provider.
`
    } else {
      // Case brief
      subject = `Case Review Summary - ${content.recordCount || 'Multiple'} Records Analyzed`

      const findingsHtml = content.keyFindings?.map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('') || ''
      const questionsHtml = content.questionsForDoctorList?.map((q, i) => `<li style="margin-bottom: 8px;">${i + 1}. ${q}</li>`).join('') || ''
      const gapsHtml = content.gaps?.map(g => `<li style="margin-bottom: 8px;">${g}</li>`).join('') || ''
      const timelineHtml = content.timeline?.map(t => `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.date}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.event}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">${t.source}</td></tr>`).join('') || ''

      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #0f172a; font-size: 24px; margin: 0;">
        <span style="background: linear-gradient(to right, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">opencancer</span><span style="color: #94a3b8;">.ai</span>
      </h1>
    </div>

    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
        Hi ${toName},
      </p>
      <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
        ${fromName} shared their AI case review with you. This summary is based on ${content.recordCount || 'multiple'} medical records.
      </p>

      ${content.bottomLine ? `
      <div style="background: linear-gradient(135deg, #f5f3ff, #fdf4ff); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #8b5cf6;">
        <h3 style="color: #7c3aed; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">The Bottom Line</h3>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">${content.bottomLine}</p>
      </div>
      ` : ''}

      ${content.cancerSummary?.type ? `
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase;">Cancer Overview</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><span style="color: #6b7280; font-size: 12px;">Type:</span><br><strong style="color: #1f2937;">${content.cancerSummary.type}</strong></div>
          <div><span style="color: #6b7280; font-size: 12px;">Stage:</span><br><strong style="color: #1f2937;">${content.cancerSummary.stage || 'Not specified'}</strong></div>
          ${content.cancerSummary.biomarkers?.length ? `<div style="grid-column: span 2;"><span style="color: #6b7280; font-size: 12px;">Biomarkers:</span><br><strong style="color: #1f2937;">${content.cancerSummary.biomarkers.join(', ')}</strong></div>` : ''}
          ${content.cancerSummary.treatments?.length ? `<div style="grid-column: span 2;"><span style="color: #6b7280; font-size: 12px;">Treatments:</span><br><strong style="color: #1f2937;">${content.cancerSummary.treatments.join(', ')}</strong></div>` : ''}
        </div>
      </div>
      ` : ''}

      ${findingsHtml ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase;">Key Findings</h3>
        <ul style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">${findingsHtml}</ul>
      </div>
      ` : ''}

      ${questionsHtml ? `
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Questions to Ask Doctor</h3>
        <ul style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">${questionsHtml}</ul>
      </div>
      ` : ''}

      ${gapsHtml ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase;">Information Gaps</h3>
        <ul style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">${gapsHtml}</ul>
      </div>
      ` : ''}

      ${timelineHtml ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase;">Timeline</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Date</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Event</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Source</th>
            </tr>
          </thead>
          <tbody>${timelineHtml}</tbody>
        </table>
      </div>
      ` : ''}

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          This case review was generated by <a href="${appUrl}" style="color: #7c3aed;">opencancer.ai</a>. Always discuss results with a healthcare provider.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

      text = `
CASE REVIEW SUMMARY
Shared by ${fromName}
Records analyzed: ${content.recordCount || 'Multiple'}

${content.bottomLine ? `THE BOTTOM LINE:\n${content.bottomLine}\n` : ''}

${content.cancerSummary?.type ? `CANCER OVERVIEW:
Type: ${content.cancerSummary.type}
Stage: ${content.cancerSummary.stage || 'Not specified'}
${content.cancerSummary.biomarkers?.length ? `Biomarkers: ${content.cancerSummary.biomarkers.join(', ')}` : ''}
${content.cancerSummary.treatments?.length ? `Treatments: ${content.cancerSummary.treatments.join(', ')}` : ''}
` : ''}

${content.keyFindings?.length ? `KEY FINDINGS:\n${content.keyFindings.map(f => `- ${f}`).join('\n')}\n` : ''}

${content.questionsForDoctorList?.length ? `QUESTIONS TO ASK DOCTOR:\n${content.questionsForDoctorList.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : ''}

${content.gaps?.length ? `INFORMATION GAPS:\n${content.gaps.map(g => `- ${g}`).join('\n')}\n` : ''}

${content.timeline?.length ? `TIMELINE:\n${content.timeline.map(t => `${t.date}: ${t.event} (${t.source})`).join('\n')}\n` : ''}

---
Generated by opencancer.ai. Always discuss with your healthcare provider.
`
    }

    // Get auth token from request if available
    const authHeader = request.headers.get('authorization')

    // Send email via Supabase edge function (which has RESEND_API_KEY configured)
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: subject,
        html: html,
        text: text,
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Email send failed:', emailResult)
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    console.log('Report email sent:', emailResult)

    return NextResponse.json({
      success: true,
      message: 'Report sent successfully',
      emailId: emailResult.emailId,
    })

  } catch (error: unknown) {
    console.error('Error sending report email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}

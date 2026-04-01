import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

interface ChecklistItem {
  id: string
  checked: boolean
  note: string
}

interface Test {
  name: string
  reason: string
  priority: 'essential' | 'emerging'
  urgency?: string
}

interface Biomarker {
  marker: string
  drug: string
  indication: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      cancerType,
      subtype,
      stage,
      tests,
      checklistItems,
      questions,
      appointmentNotes,
      biomarkers,
      saveEmail,
    } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Save email to opencancer_profiles if not logged in
    if (saveEmail) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Check if profile exists
        const { data: existing } = await supabase
          .from('opencancer_profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (existing) {
          // Update existing - add cancer type if not set
          await supabase
            .from('opencancer_profiles')
            .update({
              cancer_type: cancerType,
              updated_at: new Date().toISOString(),
            })
            .eq('email', email)
        } else {
          // Create new profile
          await supabase.from('opencancer_profiles').insert({
            email,
            cancer_type: cancerType,
            role: 'patient',
            source: 'checklist_email',
          })
        }
      } catch (dbErr) {
        console.error('Failed to save profile:', dbErr)
        // Continue anyway - email is more important
      }
    }

    // Build the email HTML
    const essentialTests = tests.filter((t: Test) => t.priority === 'essential')
    const emergingTests = tests.filter((t: Test) => t.priority === 'emerging')

    const formatTest = (test: Test, items: Record<string, ChecklistItem>) => {
      const item = items[test.name]
      const status = item?.checked ? '✅' : '⬜'
      const note = item?.note ? `<br><em style="color: #6b7280; font-size: 14px;">Note: ${item.note}</em>` : ''
      return `<li style="margin-bottom: 12px;">${status} <strong>${test.name}</strong><br><span style="color: #6b7280; font-size: 14px;">${test.reason}</span>${note}</li>`
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Cancer Checklist</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
      ${cancerType}${subtype ? ` • ${subtype}` : ''}${stage ? ` • ${stage}` : ''}
    </p>
  </div>

  ${questions && questions.length > 0 ? `
  <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
    <h2 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px;">🗣️ Questions for Your Doctor</h2>
    <ul style="margin: 0; padding-left: 20px; color: #1e293b;">
      ${questions.map((q: string) => `<li style="margin-bottom: 8px;">${q}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${appointmentNotes ? `
  <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
    <h2 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">📝 Your Notes</h2>
    <p style="margin: 0; white-space: pre-wrap; color: #1e293b;">${appointmentNotes}</p>
  </div>
  ` : ''}

  <div style="margin-bottom: 24px;">
    <h2 style="color: #7c3aed; margin: 0 0 16px 0; font-size: 18px;">✓ Essential Tests (NCCN Guidelines)</h2>
    <ul style="margin: 0; padding-left: 20px; list-style: none;">
      ${essentialTests.map((t: Test) => formatTest(t, checklistItems || {})).join('')}
    </ul>
  </div>

  ${emergingTests.length > 0 ? `
  <div style="margin-bottom: 24px;">
    <h2 style="color: #ea580c; margin: 0 0 16px 0; font-size: 18px;">🔬 Emerging Tests</h2>
    <ul style="margin: 0; padding-left: 20px; list-style: none;">
      ${emergingTests.map((t: Test) => formatTest(t, checklistItems || {})).join('')}
    </ul>
  </div>
  ` : ''}

  ${biomarkers && biomarkers.length > 0 ? `
  <div style="margin-bottom: 24px;">
    <h2 style="color: #7c3aed; margin: 0 0 16px 0; font-size: 18px;">🧬 Key Biomarkers</h2>
    <ul style="margin: 0; padding-left: 20px;">
      ${biomarkers.map((b: Biomarker) => `<li style="margin-bottom: 8px;"><strong>${b.marker}</strong> → ${b.drug}<br><span style="color: #6b7280; font-size: 14px;">${b.indication}</span></li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin-top: 32px;">
    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
      Generated by <a href="https://opencancer.ai" style="color: #7c3aed;">opencancer.ai</a>
    </p>
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
      This is educational information only — always consult your oncologist.
    </p>
  </div>
</body>
</html>
`

    const { error } = await getResend().emails.send({
      from: 'opencancer.ai <checklist@opencancer.ai>',
      to: email,
      subject: `Your ${cancerType} Checklist - opencancer.ai`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

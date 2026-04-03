import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

interface InviteRequest {
  emails: string[]
  hubSlug: string
  patientName: string
  inviterName?: string
  personalMessage?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { emails, hubSlug, patientName, inviterName, personalMessage }: InviteRequest = await request.json()

    if (!emails || emails.length === 0 || !hubSlug || !patientName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate emails
    const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (validEmails.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opencancer.ai'
    const hubUrl = `${appUrl}/hub/${hubSlug}`
    const fromName = inviterName || 'Someone who cares'

    const subject = `You're invited to ${patientName}'s CareCircle`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fff5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 16px;">💝</div>
      <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 8px;">
        You're invited to join <strong>${patientName}'s</strong> CareCircle
      </h1>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${fromName} has invited you to join ${patientName}'s CareCircle — a private space to receive health updates and stay connected during their cancer journey.
      </p>

      ${personalMessage ? `
      <div style="background: #f8fafc; border-left: 4px solid #ec4899; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
          "${personalMessage}"
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">— ${fromName}</p>
      </div>
      ` : ''}

      <!-- What is CareCircle -->
      <div style="background: #fdf2f8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #be185d; font-size: 14px; font-weight: 600; margin: 0 0 12px;">What is CareCircle?</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
          CareCircle is a private hub where ${patientName} can post updates once, and everyone who cares stays informed. No more repeating the same information to different people.
        </p>
      </div>

      <!-- CTA Button -->
      <a href="${hubUrl}" style="display: block; background: linear-gradient(to right, #f43f5e, #ec4899); color: white; text-align: center; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
        Join ${patientName}'s CareCircle
      </a>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
        You can also visit: <a href="${hubUrl}" style="color: #ec4899;">${hubUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0 0 8px;">
        <a href="${appUrl}" style="color: #ec4899;">opencancer.ai</a> — AI-powered tools for cancer patients and caregivers
      </p>
      <p style="margin: 0;">Built by a cancer survivor. 100% free.</p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
You're invited to join ${patientName}'s CareCircle

${fromName} has invited you to join ${patientName}'s CareCircle — a private space to receive health updates and stay connected during their cancer journey.

${personalMessage ? `"${personalMessage}" — ${fromName}\n` : ''}

What is CareCircle?
CareCircle is a private hub where ${patientName} can post updates once, and everyone who cares stays informed.

Join here: ${hubUrl}

---
opencancer.ai — AI-powered tools for cancer patients and caregivers
Built by a cancer survivor. 100% free.
    `

    // Send emails
    const results = await Promise.allSettled(
      validEmails.map(email =>
        resend.emails.send({
          from: 'opencancer.ai <hello@opencancer.ai>',
          to: [email],
          subject: subject,
          html: html,
          text: text,
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`CareCircle invites sent: ${sent} success, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: validEmails.length,
    })

  } catch (error: unknown) {
    console.error('Error sending CareCircle invites:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invites' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Cancer type labels for display
const CANCER_LABELS: Record<string, string> = {
  breast: 'Breast Cancer',
  prostate: 'Prostate Cancer',
  lung: 'Lung Cancer',
  colorectal: 'Colorectal Cancer',
  melanoma: 'Melanoma',
  lymphoma: 'Lymphoma',
  leukemia: 'Leukemia',
  pancreatic: 'Pancreatic Cancer',
  ovarian: 'Ovarian Cancer',
  bladder: 'Bladder Cancer',
  kidney: 'Kidney Cancer',
  thyroid: 'Thyroid Cancer',
  liver: 'Liver Cancer',
  brain: 'Brain Cancer',
  other: 'Cancer',
}

interface WelcomeEmailRequest {
  email: string
  name: string
  cancerType: string
  role: 'patient' | 'caregiver'
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // Initialize Resend client lazily (not at module load time)
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { email, name, cancerType, role }: WelcomeEmailRequest = await request.json()

    if (!email || !name || !cancerType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cancerLabel = CANCER_LABELS[cancerType] || cancerType.replace(/_/g, ' ')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opencancer.ai'
    const firstName = name.split(' ')[0]
    const isCaregiver = role === 'caregiver'

    const subject = `Welcome to opencancer.ai, ${firstName}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #0f172a; font-size: 28px; margin: 0 0 8px;">
        <span style="background: linear-gradient(to right, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">opencancer</span><span style="color: #94a3b8;">.ai</span>
      </h1>
      <p style="color: #64748b; font-size: 16px; margin: 0;">
        Your AI-powered cancer navigation tools are ready
      </p>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${firstName},
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${isCaregiver
          ? `Thank you for joining opencancer.ai to support someone facing ${cancerLabel}. Your care makes a difference.`
          : `Thank you for joining opencancer.ai. We're here to help you navigate your ${cancerLabel} journey with clarity.`
        }
      </p>

      <!-- Tools Section -->
      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #7c3aed; font-size: 14px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">Your Free Tools</h3>

        <div style="margin-bottom: 12px;">
          <a href="${appUrl}/records" style="color: #7c3aed; font-weight: 600; text-decoration: none;">Records Vault</a>
          <span style="color: #6b7280;"> - Upload and translate medical records to plain English</span>
        </div>

        <div style="margin-bottom: 12px;">
          <a href="${appUrl}/ask" style="color: #7c3aed; font-weight: 600; text-decoration: none;">Ask Navis</a>
          <span style="color: #6b7280;"> - Ask questions, get answers with sources</span>
        </div>

        <div style="margin-bottom: 12px;">
          <a href="${appUrl}/cancer-checklist" style="color: #7c3aed; font-weight: 600; text-decoration: none;">Cancer Checklist</a>
          <span style="color: #6b7280;"> - NCCN guideline-based care checklist</span>
        </div>

        <div>
          <a href="${appUrl}/trials" style="color: #7c3aed; font-weight: 600; text-decoration: none;">Clinical Trials</a>
          <span style="color: #6b7280;"> - Search trials in plain English</span>
        </div>
      </div>

      <!-- CTA Button -->
      <a href="${appUrl}/records" style="display: block; background: linear-gradient(to right, #8b5cf6, #d946ef); color: white; text-align: center; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
        Start Using Your Tools
      </a>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
        Built by a cancer survivor. 100% free. Your data stays yours.
      </p>
    </div>

    <!-- Community -->
    <div style="text-align: center; margin-top: 24px; padding: 20px; background: white; border-radius: 12px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 12px;">
        <strong>Join our community</strong>
      </p>
      <a href="https://community.cancerpatientlab.org" style="color: #7c3aed; text-decoration: none; font-size: 14px;">
        community.cancerpatientlab.org
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0 0 8px;">Questions? Reply to this email or visit <a href="${appUrl}" style="color: #7c3aed;">opencancer.ai</a></p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} opencancer.ai</p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
Welcome to opencancer.ai, ${firstName}!

${isCaregiver
  ? `Thank you for joining opencancer.ai to support someone facing ${cancerLabel}. Your care makes a difference.`
  : `Thank you for joining opencancer.ai. We're here to help you navigate your ${cancerLabel} journey with clarity.`
}

YOUR FREE TOOLS:

Records Vault - Upload and translate medical records to plain English
${appUrl}/records

Ask Navis - Ask questions, get answers with sources
${appUrl}/ask

Cancer Checklist - NCCN guideline-based care checklist
${appUrl}/cancer-checklist

Clinical Trials - Search trials in plain English
${appUrl}/trials

---

Join our community: https://community.cancerpatientlab.org

Built by a cancer survivor. 100% free. Your data stays yours.

Questions? Reply to this email or visit ${appUrl}
    `

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'opencancer.ai <hello@opencancer.ai>',
      to: [email],
      subject: subject,
      html: html,
      text: text,
    })

    console.log('Welcome email sent:', emailResponse)

    // Also notify admin (non-blocking)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      try {
        await resend.emails.send({
          from: 'opencancer.ai <notifications@opencancer.ai>',
          to: [adminEmail],
          subject: `New User: ${email} (${cancerLabel})`,
          html: `
            <h2>New User Signup</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Cancer Type:</strong> ${cancerLabel}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          `,
          text: `New User: ${name} (${email}) - ${role} - ${cancerLabel}`,
        })
      } catch (adminErr) {
        console.warn('Admin notification failed:', adminErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent',
      resendId: emailResponse.data?.id,
    })

  } catch (error: unknown) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a pitch deck generator. Given answers to discovery questions, generate a complete 10-slide HTML pitch deck using Tailwind CSS.

The deck must follow Kawasaki 10/20/30 rules:
- Exactly 10 slides
- 30pt+ fonts (use text-2xl minimum for body, text-5xl+ for headlines)
- One idea per slide

Output ONLY valid HTML starting with <!DOCTYPE html>. No markdown, no explanation.

Use this structure:
1. Title - Company name + one-line positioning
2. Problem - Pain with DATA (stats, not emotion)
3. Why Now - Market timing + wedge
4. Solution - How you fix it (outcome, not features)
5. How It Works - 3-step process
6. Business Model - ONE clear revenue model
7. Traction - Metrics WITH timeframes
8. Competition - Honest comparison table (never "no competitors")
9. Team - Why YOU win (credentials)
10. Ask - $ amount + use of funds + milestone

CRITICAL DESIGN RULES (ADA compliance required):
- Light theme: bg-white or bg-gray-50 background, text-gray-900 for body text
- Headlines: text-gray-900 (dark) with text-5xl or larger
- Body text: text-gray-700 minimum, NEVER lighter than text-gray-600
- Accent color: teal-600 for headlines/CTAs (not teal-400 on light backgrounds)
- Contrast ratio must be 4.5:1 minimum (WCAG AA)
- NEVER use gray text lighter than gray-600 on white backgrounds
- Each slide is a full-screen section with scroll-snap
- Use shadow-sm or subtle borders to separate slides

COMPANY NAME BADGE (required on every slide):
- Add a small company name badge in the top-left corner of EVERY slide
- Style: <div class="absolute top-6 left-8 text-sm font-medium text-gray-500">{Company Name}</div>
- This provides consistent branding across all slides
- The badge should be subtle but visible

Include Tailwind CDN in the HTML head.`

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const userPrompt = `Generate a pitch deck based on these answers:

Company Name: ${answers.companyName}
1. What they do: ${answers.oneLiner}
2. Who's desperate: ${answers.desperatePerson}
3. Current solution: ${answers.currentSolution}
4. Unfair advantage: ${answers.unfairAdvantage}
5. Business model: ${answers.businessModel}
6. Raising: ${answers.raiseAmount} to achieve: ${answers.raiseMilestone}

Generate the complete HTML deck now. Remember to include "${answers.companyName}" in the top-left of every slide.`

    // Call Anthropic API directly with fetch
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicResponse.status} - ${errorData}` },
        { status: 500 }
      )
    }

    const message = await anthropicResponse.json()

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const html = content.text

    // Basic scoring based on content presence
    const score = calculateScore(html, answers)

    return NextResponse.json({
      html,
      score: score.total,
      scoreBreakdown: score.breakdown,
      gaps: score.gaps,
    })
  } catch (error) {
    console.error('Generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate deck: ${message}` },
      { status: 500 }
    )
  }
}

function calculateScore(html: string, answers: Record<string, string>) {
  const breakdown: Record<string, number> = {}
  const gaps: string[] = []

  // Clarity (3 pts) - one-liner is specific
  const hasSpecificOneLiner = answers.oneLiner && answers.oneLiner.length > 20
  breakdown.clarity = hasSpecificOneLiner ? 3 : 2
  if (!hasSpecificOneLiner) gaps.push('One-liner could be more specific')

  // Problem Urgency (3 pts) - current solution is painful
  const hasPainfulProblem = answers.currentSolution && answers.currentSolution.length > 50
  breakdown.problemUrgency = hasPainfulProblem ? 3 : 2
  if (!hasPainfulProblem) gaps.push('Describe the current pain more vividly')

  // Believability (3 pts) - unfair advantage is credible
  const hasCredentials = answers.unfairAdvantage &&
    (answers.unfairAdvantage.toLowerCase().includes('ex-') ||
     answers.unfairAdvantage.toLowerCase().includes('built') ||
     answers.unfairAdvantage.toLowerCase().includes('led'))
  breakdown.believability = hasCredentials ? 3 : 2
  if (!hasCredentials) gaps.push('Add specific credentials (ex-Company, built X)')

  // GTM (3 pts) - business model is clear
  breakdown.gtm = answers.businessModel ? 3 : 1
  if (!answers.businessModel) gaps.push('Specify how you acquire customers')

  // Traction (3 pts) - hard to assess without data
  breakdown.traction = 2
  gaps.push('Add specific traction numbers with timeframes')

  // Business Model (2 pts)
  breakdown.businessModel = answers.businessModel ? 2 : 1

  // The Ask (2 pts)
  const hasSpecificAsk = answers.raiseAmount && answers.raiseMilestone
  breakdown.theAsk = hasSpecificAsk ? 2 : 1
  if (!hasSpecificAsk) gaps.push('Be more specific about raise amount and milestone')

  // Kawasaki (3 pts) - HTML has proper structure
  const hasProperStructure = html.includes('slide') && html.includes('text-2xl')
  breakdown.kawasaki = hasProperStructure ? 3 : 2

  // Visual (2 pts)
  breakdown.visual = 2

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return { total, breakdown, gaps: gaps.slice(0, 3) }
}

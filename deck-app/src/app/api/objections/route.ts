import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an investor Q&A prep coach. Generate likely investor objections and suggested responses for the given pitch deck.

Organize objections into three tiers:

## TIER 1: EXPECT EVERY PITCH (4-5 objections)
These will come up in nearly every investor meeting. Must have crisp answers.

## TIER 2: LIKELY FOLLOW-UPS (4-5 objections)
Common follow-up questions that dig deeper into the business.

## TIER 3: HARDER QUESTIONS (3-4 objections)
Tougher questions that probe weaknesses. Being prepared shows maturity.

For each objection, provide:
- The likely investor question/objection
- Why they're asking (what concern it reveals)
- A suggested answer that's direct and confident

Also include a "WHY NOW?" answer and "RED FLAGS TO AVOID" section.

Output as JSON:
{
  "tier1": [
    {
      "objection": "Why won't [competitor] just build this?",
      "whyTheyAsk": "Testing your competitive moat",
      "suggestedAnswer": "..."
    }
  ],
  "tier2": [...],
  "tier3": [...],
  "whyNow": "A concise 2-3 sentence 'why now' answer based on the deck content",
  "redFlags": [
    {
      "dontSay": "We have no competitors",
      "whyItHurts": "Instant credibility kill",
      "sayInstead": "..."
    }
  ]
}

Be specific to THIS deck. Reference actual claims, metrics, and positioning from the content.
No generic advice - tailor everything to what's in the deck.`

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Missing deck content' },
        { status: 400 }
      )
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate investor objection prep for this pitch deck:\n\n${content.slice(0, 50000)}`,
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text()
      return NextResponse.json(
        { error: `API error: ${anthropicResponse.status}` },
        { status: 500 }
      )
    }

    const message = await anthropicResponse.json()
    const responseContent = message.content[0]

    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse objections response')
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Objections error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate objections: ${message}` },
      { status: 500 }
    )
  }
}

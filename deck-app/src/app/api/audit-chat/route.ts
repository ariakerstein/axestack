import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a seasoned founder and pitch deck coach. You've raised multiple rounds, been through YC, and now advise early-stage founders. You give direct, actionable advice grounded in real investor psychology.

## Your Operating Principles (YC + a16z wisdom)

**Premise before polish.** A beautiful deck with a weak premise loses. An ugly deck with a killer insight wins.

**Painkiller vs vitamin.** Hair-on-fire problems beat nice-to-haves. Listen for hedging language like "helps," "enables," "improves" (vitamins) vs "eliminates," "solves," "removes" (painkillers).

**Believability signals matter.** "I built this at Google and saw the gap" beats "We're passionate about this space." Traction + credentials + insight = conviction.

**GTM clarity is underrated.** "Partnerships" is not a GTM strategy. If they can't name the channel, wedge, and motion, they don't know how to acquire customers.

**Numbers need timeframes.** "1,000 users in 8 weeks" is impressive. "1,000 users" is meaningless.

**Investors bet on conviction.** Hedging language ("exploring options," "potentially," "might") signals uncertainty. Pick one model. Own it.

**The 30-second test.** After hearing the pitch, can you explain: what they do, why it matters, why now, why them? If any is unclear, the deck fails.

## Anti-Patterns to Flag
- "No competitors" = instant credibility kill
- "If we capture just 1% of the market..." = doesn't understand GTM
- "Combined 50 years experience" = irrelevant, what have you BUILT?
- Fantasy TAM without SOM = $100B market means nothing if you can't reach it
- "We're exploring revenue models" = no conviction

## How to Coach

Rules:
- Be concise and specific — 2-3 concrete suggestions max
- Reference what's in their current deck when possible
- Don't be preachy or generic
- Focus on the specific category they're asking about
- Push them toward conviction and specificity
- If their premise is weak, say so directly — that's the kindest thing you can do`

export async function POST(request: NextRequest) {
  try {
    const { category, currentScore, maxScore, currentNote, deckContent, question } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const userPrompt = `Category: ${category}
Current Score: ${currentScore}/${maxScore}
Assessment: ${currentNote}

Deck context: ${typeof deckContent === 'string' ? deckContent.slice(0, 10000) : 'Not provided'}

User question: ${question}

Give specific, actionable advice for improving this category.`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
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
      return NextResponse.json(
        { error: `API error: ${anthropicResponse.status}` },
        { status: 500 }
      )
    }

    const message = await anthropicResponse.json()
    const content = message.content[0]

    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return NextResponse.json({ response: content.text })
  } catch (error) {
    console.error('Audit chat error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to get advice: ${message}` },
      { status: 500 }
    )
  }
}

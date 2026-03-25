import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a pitch deck auditor. Analyze the deck content and score it against this framework:

## SCORING RUBRIC (30 pts)

### PREMISE & CONVICTION (15 pts)
- Clarity (3 pts): Can I explain this to someone else in 30 seconds? No jargon soup.
- Problem Urgency (3 pts): Painkiller or vitamin? Hair-on-fire problem or "nice to have"?
- Believability (3 pts): Do I believe THIS team can execute? Credentials + traction + insight.
- Upside (3 pts): If this works, is it 100x? Venture-scale or lifestyle business?
- Non-consensus (3 pts): Is there a contrarian insight? "Everyone thinks X, but actually Y"

### CONTENT & PROOF (10 pts)
- GTM Clarity (3 pts): HOW do you acquire customers? Channel, wedge, motion. Not "partnerships."
- Traction (3 pts): Numbers WITH timeframes. "1K users in 8 weeks" not "1K users."
- Business Model (2 pts): ONE clear way you make money. Not "exploring options."
- The Ask (2 pts): Specific $ amount + specific use of funds + milestones it unlocks.

### STRUCTURE & DESIGN (5 pts)
- Kawasaki (3 pts): ≤10 slides, ≥30pt fonts (heuristic), one idea per slide
- Visual (2 pts): Hierarchy, consistency, no broken images, no text walls

### SCORING BANDS
- 27-30: Investor Ready — Send it
- 22-26: Almost Ready — Fix 2-3 items
- 17-21: Needs Work — Structural issues
- <17: Rethink — Premise or story problems

Output your analysis as JSON with this structure:
{
  "score": <total out of 30>,
  "scoreBreakdown": {
    "clarity": { "score": <0-3>, "max": 3, "note": "<one line assessment>" },
    "problemUrgency": { "score": <0-3>, "max": 3, "note": "<painkiller or vitamin?>" },
    "believability": { "score": <0-3>, "max": 3, "note": "<team + traction signal>" },
    "upside": { "score": <0-3>, "max": 3, "note": "<venture-scale?>" },
    "nonConsensus": { "score": <0-3>, "max": 3, "note": "<contrarian bet clear?>" },
    "gtmClarity": { "score": <0-3>, "max": 3, "note": "<how acquire customers?>" },
    "traction": { "score": <0-3>, "max": 3, "note": "<numbers + timeframes?>" },
    "businessModel": { "score": <0-2>, "max": 2, "note": "<clear single model?>" },
    "theAsk": { "score": <0-2>, "max": 2, "note": "<specific amount + use?>" },
    "kawasaki": { "score": <0-3>, "max": 3, "note": "<slides, fonts, density>" },
    "visual": { "score": <0-2>, "max": 2, "note": "<hierarchy, consistency>" }
  },
  "verdict": "<Investor Ready | Almost Ready | Needs Work | Rethink>",
  "topFixes": [
    "<specific actionable fix 1>",
    "<specific actionable fix 2>",
    "<specific actionable fix 3>"
  ],
  "detailedNotes": "<2-3 paragraphs of specific feedback>"
}

Be direct and specific. No generic praise. Point out exactly what's weak and how to fix it.`

export async function POST(request: NextRequest) {
  try {
    const { url, content } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    let deckContent = content

    // If URL provided, fetch the content
    if (url && !content) {
      try {
        const response = await fetch(url)
        deckContent = await response.text()
      } catch {
        return NextResponse.json(
          { error: 'Failed to fetch deck from URL' },
          { status: 400 }
        )
      }
    }

    if (!deckContent) {
      return NextResponse.json(
        { error: 'No deck content provided' },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Audit this pitch deck and provide a detailed scorecard:\n\n${deckContent.slice(0, 50000)}`,
        },
      ],
      system: SYSTEM_PROMPT,
    })

    const responseContent = message.content[0]
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse audit response')
    }

    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit error:', error)
    return NextResponse.json(
      { error: 'Failed to audit deck' },
      { status: 500 }
    )
  }
}

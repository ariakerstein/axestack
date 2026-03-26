import { NextRequest, NextResponse } from 'next/server'

type Stage = 'pre-seed' | 'seed' | 'series-a' | 'series-b'

const STAGE_CONTEXT: Record<Stage, string> = {
  'pre-seed': `
## STAGE CONTEXT: PRE-SEED
At pre-seed, investors bet on TEAM + VISION + INSIGHT. Traction expectations are LOW.
- Traction: Waitlist, LOIs, pilot commitments, or early user signal is sufficient. Don't penalize for lack of revenue.
- Unit economics: Not expected yet. Don't penalize for missing LTV/CAC.
- Team: This is THE deciding factor. Credentials, domain expertise, unique insight matter most.
- Problem/Vision: Must be compelling and clearly articulated.
- GTM: Can be directional ("we'll start with X"). Doesn't need to be proven yet.
Score traction relative to stage - a waitlist of 500 people is impressive at pre-seed.`,

  'seed': `
## STAGE CONTEXT: SEED
At seed, investors want EARLY PMF SIGNAL + GTM CLARITY + VELOCITY.
- Traction: Must show momentum with timeframes. "1K users in 8 weeks" or "10 paying customers in 2 months."
- Unit economics: Early signals helpful but not required. Know your CAC even if rough.
- Team: Still important but traction can compensate for weaker credentials.
- GTM: Must be specific. Name the channel, the wedge, the motion.
- Revenue: Early revenue is a strong signal but not required.
Score traction with appropriate seed expectations - $10K MRR is great, $0 with strong user growth is fine.`,

  'series-a': `
## STAGE CONTEXT: SERIES A
At Series A, investors need PROVEN PMF + UNIT ECONOMICS + REPEATABLE GTM.
- Traction: Must show real revenue or strong usage metrics with clear growth trajectory.
- Unit economics: LTV/CAC should be known and defensible. Path to profitability matters.
- Team: Execution track record matters. Have they hit milestones?
- GTM: Must be proven and repeatable. "We know how to acquire customers profitably."
- Revenue: Expected. $1M+ ARR is typical benchmark.
Score with Series A expectations - vague GTM or missing unit economics are serious gaps.`,

  'series-b': `
## STAGE CONTEXT: SERIES B+
At Series B+, investors want SCALE + EXPANSION + MARKET LEADERSHIP.
- Traction: Strong revenue growth, clear market position, expansion metrics.
- Unit economics: Must be proven and improving. Efficiency matters.
- Team: Leadership team completeness, ability to scale org.
- GTM: Multiple proven channels, international expansion potential.
- Market: Category leadership or clear path to it.
Score with growth-stage expectations - this is about scaling what works, not finding PMF.`
}

const getSystemPrompt = (stage?: Stage) => {
  const stageContext = stage ? STAGE_CONTEXT[stage] : ''

  return `You are a pitch deck auditor. Analyze the deck content and score it against this framework:
${stageContext}

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

Be direct and specific. No generic praise. Point out exactly what's weak and how to fix it.
Score relative to the stage context above - what matters at pre-seed is different from Series A.`
}

export async function POST(request: NextRequest) {
  try {
    const { url, content, stage } = await request.json()

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
        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch deck: HTTP ${response.status}` },
            { status: 400 }
          )
        }
        deckContent = await response.text()
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : 'Unknown'
        return NextResponse.json(
          { error: `Failed to fetch deck from URL: ${msg}` },
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

    // Get stage-aware system prompt
    const systemPrompt = getSystemPrompt(stage as Stage | undefined)

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
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Audit this ${stage ? stage + ' ' : ''}pitch deck and provide a detailed scorecard:\n\n${deckContent.slice(0, 50000)}`,
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

    // Return the deck content so client can edit it
    return NextResponse.json({
      ...result,
      deckContent: deckContent.slice(0, 100000), // Limit size
    })
  } catch (error) {
    console.error('Audit error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to audit deck: ${message}` },
      { status: 500 }
    )
  }
}

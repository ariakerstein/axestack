import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a source checker for pitch decks. Analyze the HTML deck and identify claims that need citations or sources.

For each claim that lacks a source, output a JSON array with objects containing:
- slide: the slide number (1-10)
- claim: the specific claim that needs a source
- suggestion: a suggested source type or where to find this data (e.g., "Industry report from Gartner", "CDC statistics", "Company case study")

Focus on:
1. Statistics and numbers (percentages, dollar amounts, user counts)
2. Market size claims (TAM, SAM, SOM)
3. Competitor comparisons
4. Growth rates or projections
5. Medical/scientific claims
6. Pricing comparisons

Ignore:
- Obvious facts that don't need citation
- The company's own product descriptions
- Generic statements

Output ONLY valid JSON array. No explanation. Example:
[
  {"slide": 2, "claim": "84% of patients never seek a second opinion", "suggestion": "Medical journal study or health survey (e.g., JAMA, Health Affairs)"},
  {"slide": 6, "claim": "$9B market opportunity", "suggestion": "Market research report (e.g., Grand View Research, IBISWorld)"}
]

If no issues found, output: []`

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    if (!html) {
      return NextResponse.json(
        { error: 'Missing html' },
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
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Check this pitch deck for claims that need sources:\n\n${html.slice(0, 30000)}`,
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
    const content = message.content[0]

    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    let issues = []
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        issues = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.error('Failed to parse sources response:', content.text)
      issues = []
    }

    return NextResponse.json({ issues })
  } catch (error) {
    console.error('Check sources error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to check sources: ${message}` },
      { status: 500 }
    )
  }
}

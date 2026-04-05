import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

interface Perspective {
  name: string
  icon: string
  color: string
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
}

interface CombatResult {
  phase: 'diagnosis' | 'treatment'
  question: string
  perspectives: Perspective[]
  synthesis: string
  consensus: string[]
  divergence: string[]
}

interface FollowUpMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FollowUpRequest {
  message: string
  combatAnalysisId?: string
  combatResult: CombatResult
  history: FollowUpMessage[]
  userId?: string
  sessionId?: string
}

// Detect if user is asking a question or providing a correction
function detectInteractionMode(message: string): 'ask' | 'revise' {
  const revisionPatterns = [
    /\b(actually|correction|wrong|incorrect|not right|mistake|error)\b/i,
    /\b(those|the|my)\s+\w+\s+(are|is|were|was)\s+(actually|really|SNPs?|germline|somatic|negative|positive)\b/i,
    /\b(update|change|revise|correct|fix)\b.*\b(recommendation|analysis|perspective)\b/i,
    /\bHRR\s+(mutations?|variants?)\s+(are|is)\s+\w+/i,
    /\bBRCA\b.*\b(is|are)\s+(positive|negative|germline|somatic|VUS|SNP)/i,
    /\b(not|isn't|aren't)\s+(pathogenic|actionable|germline|somatic)\b/i,
    /\bstage\s+(is|was)\s+(actually|really)\b/i,
    /\bgrade\s+(is|was)\s+(actually|really)\b/i,
    /\b(I have|I had|diagnosed with|my diagnosis)\b/i,
    /\b(you missed|didn't consider|failed to|overlooked)\b/i,
  ]

  return revisionPatterns.some(p => p.test(message)) ? 'revise' : 'ask'
}

// Build prompt for ask mode - explain reasoning without changing recommendations
function buildAskPrompt(combatResult: CombatResult, message: string, history: FollowUpMessage[]): string {
  const perspectiveSummaries = combatResult.perspectives.map(p =>
    `**${p.name}** (${p.confidence}% confidence): ${p.recommendation}`
  ).join('\n')

  const historyText = history.length > 0
    ? `\n\nPREVIOUS CONVERSATION:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}`
    : ''

  return `You are Navis, helping a cancer patient understand their CancerCombat analysis.

ORIGINAL COMBAT ANALYSIS:
Phase: ${combatResult.phase}
Question: ${combatResult.question}

PERSPECTIVES:
${perspectiveSummaries}

SYNTHESIS: ${combatResult.synthesis}

CONSENSUS: ${combatResult.consensus.join('; ')}
DIVERGENCE: ${combatResult.divergence.join('; ')}
${historyText}

The patient asks: "${message}"

INSTRUCTIONS:
- Explain the reasoning clearly and accessibly
- Reference specific perspectives when relevant
- DO NOT change or revise any recommendations
- Cite evidence from the original analysis
- Be warm and supportive while being accurate
- Keep response focused and under 300 words`
}

// Build prompt for revise mode - update recommendations based on correction
function buildRevisePrompt(combatResult: CombatResult, message: string, history: FollowUpMessage[]): string {
  const perspectivesJson = JSON.stringify(combatResult.perspectives, null, 2)

  const historyText = history.length > 0
    ? `\n\nPREVIOUS CONVERSATION:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}`
    : ''

  return `You are an oncology AI assistant revising a CancerCombat analysis based on new patient information.

ORIGINAL ANALYSIS:
Phase: ${combatResult.phase}
Question: ${combatResult.question}

PERSPECTIVES:
${perspectivesJson}

SYNTHESIS: ${combatResult.synthesis}
CONSENSUS: ${combatResult.consensus.join('; ')}
DIVERGENCE: ${combatResult.divergence.join('; ')}
${historyText}

The patient provides this correction or clarification: "${message}"

YOUR TASK:
1. Acknowledge the correction warmly
2. Identify which perspective(s) are most affected
3. Provide UPDATED analysis based on the corrected information
4. Explain what changed and the clinical significance

IMPORTANT DISTINCTIONS:
- SNPs (single nucleotide polymorphisms) and VUS (variants of uncertain significance) are NOT the same as pathogenic mutations
- Germline mutations (inherited) have different implications than somatic mutations (tumor-only)
- Clinical actionability depends on variant classification (pathogenic, likely pathogenic, VUS, etc.)

Return your response as valid JSON with this exact structure:
{
  "acknowledgment": "Brief, warm confirmation of the correction (1-2 sentences)",
  "affectedPerspectives": ["Name of perspective 1", "Name of perspective 2"],
  "revisedPerspectives": [
    {
      "name": "Perspective Name",
      "icon": "original icon",
      "color": "original color",
      "argument": "Updated argument reflecting correction",
      "evidence": ["Updated evidence point 1", "Updated evidence point 2", "Updated evidence point 3"],
      "confidence": 45,
      "recommendation": "Updated recommendation"
    }
  ],
  "revisedSynthesis": {
    "synthesis": "Updated synthesis text",
    "consensus": ["Updated consensus point 1"],
    "divergence": ["Updated divergence point 1"]
  },
  "explanation": "What changed and why it matters clinically (2-3 sentences)"
}`
}

export async function POST(request: NextRequest) {
  try {
    const body: FollowUpRequest = await request.json()
    const { message, combatResult, history = [], userId, sessionId } = body

    if (!message || !combatResult) {
      return NextResponse.json(
        { error: 'Message and combatResult are required' },
        { status: 400 }
      )
    }

    // Detect interaction mode
    const mode = detectInteractionMode(message)

    // Build appropriate prompt
    const prompt = mode === 'ask'
      ? buildAskPrompt(combatResult, message, history)
      : buildRevisePrompt(combatResult, message, history)

    // Call LLM via Supabase edge function
    const supabase = getSupabase()
    const { data, error } = await supabase.functions.invoke('direct-navis', {
      body: {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: prompt }],
        temperature: mode === 'ask' ? 0.4 : 0.2, // Lower temp for revisions
        max_tokens: mode === 'ask' ? 1000 : 2000,
      }
    })

    if (error) {
      console.error('LLM error:', error)
      return NextResponse.json(
        { error: 'Failed to process follow-up' },
        { status: 500 }
      )
    }

    const responseText = data?.content?.[0]?.text || data?.response || ''

    // Parse response based on mode
    if (mode === 'ask') {
      // Simple text response for ask mode
      return NextResponse.json({
        response: responseText,
        mode: 'ask',
        followUpQuestions: generateFollowUpQuestions(combatResult, message)
      })
    } else {
      // Parse JSON for revise mode
      try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          // If no JSON found, return as plain text with mode indicator
          return NextResponse.json({
            response: responseText,
            mode: 'revise',
            parseError: true
          })
        }

        const parsed = JSON.parse(jsonMatch[0])

        return NextResponse.json({
          response: parsed.acknowledgment + '\n\n' + parsed.explanation,
          mode: 'revise',
          affectedPerspectives: parsed.affectedPerspectives || [],
          revisedPerspectives: parsed.revisedPerspectives || [],
          revisedSynthesis: parsed.revisedSynthesis || null,
          followUpQuestions: [
            'Would you like me to explain any of the changes in more detail?',
            'Are there any other corrections I should know about?'
          ]
        })
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        // Return raw response if JSON parsing fails
        return NextResponse.json({
          response: responseText,
          mode: 'revise',
          parseError: true
        })
      }
    }

  } catch (error) {
    console.error('Follow-up error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate contextual follow-up questions
function generateFollowUpQuestions(combatResult: CombatResult, askedQuestion: string): string[] {
  const questions: string[] = []

  // Questions based on divergence points
  if (combatResult.divergence.length > 0) {
    questions.push(`Why do the perspectives disagree about ${combatResult.divergence[0].slice(0, 50)}...?`)
  }

  // Questions about specific perspectives not mentioned
  const mentionedPerspectives = combatResult.perspectives
    .filter(p => askedQuestion.toLowerCase().includes(p.name.toLowerCase()))

  if (mentionedPerspectives.length === 0) {
    const randomPerspective = combatResult.perspectives[Math.floor(Math.random() * combatResult.perspectives.length)]
    questions.push(`What does ${randomPerspective.name} think about this?`)
  }

  // Generic helpful questions
  questions.push('What questions should I ask my oncologist based on this analysis?')

  return questions.slice(0, 3)
}

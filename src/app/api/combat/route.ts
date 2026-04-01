import { NextRequest, NextResponse } from 'next/server'

// Use the same Supabase project as other AI calls
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

interface RecordInput {
  fileName: string
  documentType: string
  result: {
    document_type: string
    diagnosis: string[]
    cancer_specific: {
      cancer_type: string
      stage: string
      grade: string
      biomarkers: string[]
      treatment_timeline: string
    }
    test_summary: string
    recommended_next_steps: string[]
  }
  documentText?: string
}

// Three adversarial personas
const PERSONAS = {
  nccn: {
    name: 'NCCN Guidelines',
    icon: 'shield',
    color: 'blue',
    systemContext: `You are a conservative oncologist who strictly follows NCCN (National Comprehensive Cancer Network) guidelines.
Your perspective:
- Evidence-based medicine is paramount
- Only recommend treatments with robust Phase III trial data
- Standard of care protocols are standard for a reason
- Be cautious about unproven approaches
- Emphasize FDA-approved therapies
- Consider treatment toxicity and quality of life within established frameworks
Cite specific NCCN guideline categories when possible.`
  },

  emerging: {
    name: 'Emerging Research',
    icon: 'flask',
    color: 'purple',
    systemContext: `You are a cutting-edge oncology researcher at the forefront of cancer research.
Your perspective:
- Look for emerging therapies not yet in standard guidelines
- Consider ongoing clinical trials that might benefit this patient
- Analyze biomarkers for targeted therapy opportunities
- Reference recent publications and breakthrough treatments
- Consider combination therapies being explored in Phase I/II trials
- Look for molecular targets with emerging drugs
Be enthusiastic about promising directions while honest about evidence levels.`
  },

  integrative: {
    name: 'Integrative Oncology',
    icon: 'leaf',
    color: 'green',
    systemContext: `You are an integrative oncologist combining conventional treatment with evidence-based complementary approaches.
Your perspective:
- Whole-person care matters - physical, emotional, nutritional
- Evidence-based integrative approaches can support conventional treatment
- Focus on quality of life, symptom management, treatment tolerance
- Consider nutrition, exercise, stress reduction, sleep optimization
- Address side effect management proactively
ONLY recommend approaches with published evidence (RCTs, systematic reviews).
Do NOT recommend unproven therapies like homeopathy or crystals.
Focus on: exercise oncology, oncology nutrition, mind-body medicine, acupuncture for specific symptoms.`
  }
}

function buildCaseContext(records: RecordInput[]): string {
  let context = 'PATIENT RECORDS:\n\n'

  for (const record of records) {
    context += `--- ${record.fileName} (${record.documentType}) ---\n`

    if (record.result?.cancer_specific) {
      const cs = record.result.cancer_specific
      context += `Cancer Type: ${cs.cancer_type || 'Not specified'}\n`
      context += `Stage: ${cs.stage || 'Not specified'}\n`
      context += `Grade: ${cs.grade || 'Not specified'}\n`
      if (cs.biomarkers?.length) {
        context += `Biomarkers: ${cs.biomarkers.join(', ')}\n`
      }
      if (cs.treatment_timeline) {
        context += `Treatment Timeline: ${cs.treatment_timeline}\n`
      }
    }

    if (record.result?.diagnosis?.length) {
      context += `Diagnoses: ${record.result.diagnosis.join('; ')}\n`
    }

    if (record.result?.test_summary) {
      context += `Test Summary: ${record.result.test_summary}\n`
    }

    if (record.documentText) {
      context += `\nDocument Text (excerpt):\n${record.documentText.slice(0, 2000)}\n`
    }

    context += '\n'
  }

  return context
}

async function getPersonaPerspective(
  persona: typeof PERSONAS.nccn,
  caseContext: string,
  phase: 'diagnosis' | 'treatment',
  question: string
): Promise<{
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
}> {
  const phasePrompt = phase === 'diagnosis'
    ? `Analyze this diagnosis. Is it correct and complete? Are there alternative diagnoses to consider? What additional testing might be needed?`
    : `Evaluate treatment options for this patient. What approach would you recommend and why?`

  const fullPrompt = `${persona.systemContext}

${caseContext}

QUESTION: ${question}

${phasePrompt}

Respond in this exact JSON format:
{
  "argument": "Your main argument in 2-3 sentences",
  "evidence": ["Evidence point 1", "Evidence point 2", "Evidence point 3"],
  "confidence": 75,
  "recommendation": "Your specific recommendation in 1-2 sentences"
}

Be specific to THIS patient's case. Reference their actual biomarkers, stage, and findings.`

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: fullPrompt,
        model: 'claude-sonnet-4-20250514',
        temperature: 0.3,
        skipRAG: true, // Don't use NCCN RAG for this - personas handle guidelines
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.response || data.answer || ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Fallback
      }
    }

    return {
      argument: text.slice(0, 300),
      evidence: ['See full analysis'],
      confidence: 70,
      recommendation: 'Consult with your oncologist'
    }
  } catch (err) {
    console.error('Persona API error:', err)
    return {
      argument: 'Analysis could not be completed.',
      evidence: ['Error during analysis'],
      confidence: 0,
      recommendation: 'Please try again'
    }
  }
}

async function synthesizePerspectives(
  perspectives: Array<{ name: string; argument: string; recommendation: string }>,
  phase: 'diagnosis' | 'treatment'
): Promise<{
  synthesis: string
  consensus: string[]
  divergence: string[]
}> {
  const perspectiveSummary = perspectives
    .map(p => `${p.name}: ${p.argument}\nRecommendation: ${p.recommendation}`)
    .join('\n\n')

  const synthesisPrompt = `Three oncology perspectives have analyzed a cancer case:

${perspectiveSummary}

Synthesize these perspectives. Respond in this exact JSON format:
{
  "synthesis": "A 2-3 sentence synthesis of the key takeaways for the patient",
  "consensus": ["Point where all three agree", "Another point of agreement"],
  "divergence": ["Point where they disagree", "Another area of disagreement"]
}

Focus on actionable insights for the patient's next doctor conversation.`

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: synthesisPrompt,
        model: 'claude-sonnet-4-20250514',
        temperature: 0.2,
        skipRAG: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.response || data.answer || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Fallback
      }
    }

    return {
      synthesis: 'Multiple perspectives were analyzed. Discuss these options with your oncologist.',
      consensus: ['All perspectives agree on the importance of personalized treatment'],
      divergence: ['Perspectives differ on optimal treatment approach']
    }
  } catch (err) {
    console.error('Synthesis API error:', err)
    return {
      synthesis: 'Multiple perspectives were analyzed.',
      consensus: ['Consult your oncologist'],
      divergence: ['Different approaches suggested']
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phase, records } = await request.json()

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 })
    }

    const caseContext = buildCaseContext(records)

    // Determine the question based on phase and case
    const cancerType = records[0]?.result?.cancer_specific?.cancer_type || 'this cancer'
    const stage = records[0]?.result?.cancer_specific?.stage

    const question = phase === 'diagnosis'
      ? `Is the diagnosis of ${cancerType}${stage ? ` (${stage})` : ''} correct and complete? What should be confirmed or explored?`
      : `What are the best treatment options for ${cancerType}${stage ? ` ${stage}` : ''}?`

    // Get all three perspectives in parallel
    const [nccnResponse, emergingResponse, integrativeResponse] = await Promise.all([
      getPersonaPerspective(PERSONAS.nccn, caseContext, phase, question),
      getPersonaPerspective(PERSONAS.emerging, caseContext, phase, question),
      getPersonaPerspective(PERSONAS.integrative, caseContext, phase, question)
    ])

    const perspectives = [
      { name: 'NCCN Guidelines', icon: 'shield' as const, color: 'blue', ...nccnResponse },
      { name: 'Emerging Research', icon: 'flask' as const, color: 'purple', ...emergingResponse },
      { name: 'Integrative Oncology', icon: 'leaf' as const, color: 'green', ...integrativeResponse }
    ]

    // Synthesize the perspectives
    const synthesis = await synthesizePerspectives(
      perspectives.map(p => ({ name: p.name, argument: p.argument, recommendation: p.recommendation })),
      phase
    )

    const result = {
      phase,
      question,
      perspectives,
      ...synthesis
    }

    return NextResponse.json(result)

  } catch (err) {
    console.error('Combat API error:', err)
    return NextResponse.json({ error: 'Combat analysis failed' }, { status: 500 })
  }
}

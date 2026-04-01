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

interface PerspectiveWeights {
  guidelines: number  // 0-100
  research: number    // 0-100
  integrative: number // 0-100
}

// Get weight modifier text based on user's tuning
function getWeightModifier(weight: number): string {
  if (weight >= 80) return 'The patient VALUES YOUR PERSPECTIVE HIGHLY. Be thorough and confident in your analysis. Provide detailed reasoning.'
  if (weight >= 60) return 'The patient is interested in your perspective. Provide substantive analysis.'
  if (weight >= 40) return 'Present your perspective clearly but concisely.'
  if (weight >= 20) return 'Keep your perspective brief. Focus only on the most critical points.'
  return 'Provide only essential safety considerations from your specialty.'
}

// Three specialist perspectives - your tumor board
const PERSONAS = {
  nccn: {
    name: 'Tumor Board: Guidelines',
    icon: 'shield',
    color: 'blue',
    specialists: ['Medical Oncologist', 'Radiation Oncologist', 'Surgical Oncologist'],
    getSystemContext: (weight: number) => `You represent a tumor board following NCCN (National Comprehensive Cancer Network) guidelines.
Your panel includes:
- A Medical Oncologist specializing in systemic therapy protocols
- A Radiation Oncologist evaluating local treatment approaches
- A Surgical Oncologist assessing surgical intervention options

Your perspective:
- Evidence-based medicine from Phase III trials
- Standard of care protocols that have saved millions of lives
- FDA-approved therapies with established safety profiles
- Treatment sequencing based on proven algorithms
- Consider treatment toxicity within established risk/benefit frameworks

${getWeightModifier(weight)}

Cite specific NCCN guideline categories when possible. Speak as a unified tumor board consensus.`
  },

  emerging: {
    name: 'Tumor Board: Cutting Edge',
    icon: 'flask',
    color: 'purple',
    specialists: ['Molecular Pathologist', 'Immunotherapy Specialist', 'Clinical Trial Investigator'],
    getSystemContext: (weight: number) => `You represent a tumor board at an NCI-designated cancer center focused on precision medicine.
Your panel includes:
- A Molecular Pathologist analyzing genetic and biomarker profiles
- An Immunotherapy Specialist evaluating checkpoint inhibitors and cell therapies
- A Clinical Trial Investigator aware of emerging Phase I/II opportunities

Your perspective:
- Molecular profiling reveals targetable alterations standard panels miss
- Clinical trials may offer access to promising therapies
- Combination approaches exploring synergistic mechanisms
- Biomarker-driven treatment selection
- Novel drug targets and pathways

${getWeightModifier(weight)}

Reference specific trials (NCT numbers when relevant), recent publications, and emerging targets. Be enthusiastic but honest about evidence levels.`
  },

  integrative: {
    name: 'Tumor Board: Whole Person',
    icon: 'leaf',
    color: 'green',
    specialists: ['Integrative Oncologist', 'Oncology Nutritionist', 'Palliative Care Specialist'],
    getSystemContext: (weight: number) => `You represent a supportive care tumor board focused on treatment optimization and quality of life.
Your panel includes:
- An Integrative Oncologist combining conventional care with evidence-based complementary approaches
- An Oncology Nutritionist specializing in cancer-specific nutrition interventions
- A Palliative Care Specialist focused on symptom management and treatment tolerance

Your perspective:
- How to tolerate treatment better (fatigue, nausea, neuropathy management)
- Nutrition strategies that support treatment efficacy
- Exercise oncology - movement as medicine
- Mind-body approaches with RCT evidence (meditation, yoga for anxiety)
- Quality of life optimization throughout treatment

${getWeightModifier(weight)}

ONLY recommend approaches with published evidence (RCTs, systematic reviews).
Do NOT recommend unproven therapies like homeopathy, crystals, or supplements without evidence.
Focus on actionable, evidence-based supportive care.`
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
  question: string,
  weight: number
): Promise<{
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
  specialists: string[]
}> {
  const phasePrompt = phase === 'diagnosis'
    ? `Analyze this diagnosis. Is it correct and complete? Are there alternative diagnoses to consider? What additional testing might be needed?`
    : `Evaluate treatment options for this patient. What approach would you recommend and why?`

  const systemContext = persona.getSystemContext(weight)

  const fullPrompt = `${systemContext}

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
        const parsed = JSON.parse(jsonMatch[0])
        return { ...parsed, specialists: persona.specialists }
      } catch {
        // Fallback
      }
    }

    return {
      argument: text.slice(0, 300),
      evidence: ['See full analysis'],
      confidence: 70,
      recommendation: 'Consult with your oncologist',
      specialists: persona.specialists
    }
  } catch (err) {
    console.error('Persona API error:', err)
    return {
      argument: 'Analysis could not be completed.',
      evidence: ['Error during analysis'],
      confidence: 0,
      recommendation: 'Please try again',
      specialists: persona.specialists
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
    const { phase, records, weights } = await request.json()

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 })
    }

    // Default weights if not provided
    const perspectiveWeights: PerspectiveWeights = {
      guidelines: weights?.guidelines ?? 50,
      research: weights?.research ?? 50,
      integrative: weights?.integrative ?? 50
    }

    const caseContext = buildCaseContext(records)

    // Determine the question based on phase and case
    const cancerType = records[0]?.result?.cancer_specific?.cancer_type || 'this cancer'
    const stage = records[0]?.result?.cancer_specific?.stage

    const question = phase === 'diagnosis'
      ? `Is the diagnosis of ${cancerType}${stage ? ` (${stage})` : ''} correct and complete? What should be confirmed or explored?`
      : `What are the best treatment options for ${cancerType}${stage ? ` ${stage}` : ''}?`

    // Get all three perspectives in parallel, passing their respective weights
    const [nccnResponse, emergingResponse, integrativeResponse] = await Promise.all([
      getPersonaPerspective(PERSONAS.nccn, caseContext, phase, question, perspectiveWeights.guidelines),
      getPersonaPerspective(PERSONAS.emerging, caseContext, phase, question, perspectiveWeights.research),
      getPersonaPerspective(PERSONAS.integrative, caseContext, phase, question, perspectiveWeights.integrative)
    ])

    const perspectives = [
      { name: PERSONAS.nccn.name, icon: 'shield' as const, color: 'blue', weight: perspectiveWeights.guidelines, ...nccnResponse },
      { name: PERSONAS.emerging.name, icon: 'flask' as const, color: 'purple', weight: perspectiveWeights.research, ...emergingResponse },
      { name: PERSONAS.integrative.name, icon: 'leaf' as const, color: 'green', weight: perspectiveWeights.integrative, ...integrativeResponse }
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

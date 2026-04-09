import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import {
  extractPCO,
  orchestratePersonaRAG,
  formatForPrompt,
  type PatientContextObject,
  type OrchestratorResult
} from '@/lib/graphrag'
import { recommendTool, formatRecommendationForResponse } from '@/lib/graphrag/tool-recommender'

// Use the same Supabase project as other AI calls
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// Build PCO from Combat records + database entities
async function buildPCOFromRecords(
  records: RecordInput[],
  userId?: string,
  sessionId?: string
): Promise<PatientContextObject> {
  // Start with database-extracted PCO
  const basePCO = await extractPCO({
    userId: userId || null,
    sessionId: sessionId || `combat-${Date.now()}`, // Fallback sessionId
    traversalConfig: { max_hops: 2, min_confidence: 0.5, max_results: 100 },
    includeRelatedEntities: true
  })

  // Enrich with records data
  for (const record of records) {
    const cs = record.result?.cancer_specific

    // Add diagnosis from records
    if (cs?.cancer_type) {
      const existingDx = basePCO.diagnoses.find(d =>
        d.cancer_type.toLowerCase() === cs.cancer_type.toLowerCase()
      )
      if (!existingDx) {
        basePCO.diagnoses.push({
          cancer_type: cs.cancer_type,
          stage: cs.stage,
          histology: cs.grade,
          confidence: 0.9,
          source: 'records'
        })
      } else if (cs.stage && !existingDx.stage) {
        existingDx.stage = cs.stage
      }
    }

    // Add biomarkers from records
    if (cs?.biomarkers) {
      for (const biomarker of cs.biomarkers) {
        const upperBiomarker = biomarker.toUpperCase()
        const existingBM = basePCO.biomarkers.find(b =>
          b.name.toUpperCase() === upperBiomarker.split(/[\s:]/)[0]
        )
        if (!existingBM) {
          // Determine if positive/negative from string
          const isNegative = /negative|not detected|wild.?type/i.test(biomarker)
          basePCO.biomarkers.push({
            name: upperBiomarker.split(/[\s:]/)[0],
            value: biomarker,
            result_type: isNegative ? 'negative' : 'positive',
            source: 'unknown',
            confidence: 0.9
          })
        }
      }
    }
  }

  // Update completeness flags
  basePCO.has_diagnosis = basePCO.diagnoses.length > 0
  basePCO.has_biomarkers = basePCO.biomarkers.length > 0
  basePCO.has_treatments = basePCO.treatments.length > 0

  return basePCO
}

// Map GraphRAG persona names to Combat persona keys
const PERSONA_MAP: Record<string, keyof typeof PERSONAS> = {
  'SOC Advisor': 'guidelines',
  'Molecular Oncologist': 'precision',
  'Emerging Treatments': 'aggressive',
  'Watch & Wait': 'conservative',
  'Whole Person': 'integrative'
}

// Get GraphRAG context for a specific persona
function getGraphRAGContextForPersona(
  personaKey: string,
  graphragResult: OrchestratorResult
): string {
  // Find matching GraphRAG persona
  const graphragPersonaName = Object.entries(PERSONA_MAP).find(([_, key]) => key === personaKey)?.[0]
  if (!graphragPersonaName) return ''

  const personaResult = graphragResult.results.find(r => r.persona === graphragPersonaName)
  if (!personaResult || personaResult.chunks.length === 0) return ''

  // Format chunks for prompt
  const chunks = personaResult.chunks.slice(0, 5) // Top 5 chunks
  const formattedChunks = chunks.map((chunk, i) => {
    const source = chunk.metadata?.guideline_title || chunk.source || 'Guidelines'
    return `[Source ${i + 1}: ${source}]\n${chunk.content.slice(0, 500)}`
  }).join('\n\n')

  return `
EVIDENCE FROM MEDICAL KNOWLEDGE BASE (confidence: ${(personaResult.confidence * 100).toFixed(0)}%):
${formattedChunks}

Use this evidence to support your analysis. Cite specific sources when making claims.
`
}

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
  guidelines: number    // 0-100 - Standard of care (NCCN)
  aggressive: number    // 0-100 - Emerging evidence & clinical trials
  precision: number     // 0-100 - Molecular/targeted therapy
  conservative: number  // 0-100 - Watch & wait / de-escalation
  integrative: number   // 0-100 - Whole person / QoL
}

// Get weight modifier text based on user's tuning
function getWeightModifier(weight: number): string {
  if (weight >= 80) return 'The patient VALUES YOUR PERSPECTIVE HIGHLY. Be thorough and confident in your analysis. Provide detailed reasoning.'
  if (weight >= 60) return 'The patient is interested in your perspective. Provide substantive analysis.'
  if (weight >= 40) return 'Present your perspective clearly but concisely.'
  if (weight >= 20) return 'Keep your perspective brief. Focus only on the most critical points.'
  return 'Provide only essential safety considerations from your specialty.'
}

// Five specialist perspectives - renamed for clarity
const PERSONAS = {
  guidelines: {
    name: 'Standard of Care',
    icon: 'shield',
    color: 'blue',
    specialists: ['Medical Oncologist', 'Radiation Oncologist', 'Surgical Oncologist'],
    getSystemContext: (weight: number) => `You represent the Standard of Care perspective, following NCCN (National Comprehensive Cancer Network) guidelines.
Your panel includes:
- A Medical Oncologist specializing in systemic therapy protocols
- A Radiation Oncologist evaluating local treatment approaches
- A Surgical Oncologist assessing surgical intervention options

Your perspective:
- Evidence-based medicine from Phase III randomized trials
- Standard of care protocols proven to save millions of lives
- FDA-approved therapies with established safety profiles
- Treatment sequencing based on proven algorithms
- Consider treatment toxicity within established risk/benefit frameworks

${getWeightModifier(weight)}

Cite specific NCCN guideline categories when possible. This is the baseline that most oncologists follow.`
  },

  aggressive: {
    name: 'Emerging Evidence',
    icon: 'flask',
    color: 'violet',
    specialists: ['Research Oncologist', 'Clinical Trial Specialist', 'Clinical Pharmacologist'],
    getSystemContext: (weight: number) => `You represent the Emerging Evidence perspective, focused on the latest research and clinical trials.
Your panel includes:
- A Research Oncologist tracking cutting-edge developments
- A Clinical Trial Specialist matching patients to relevant studies
- A Clinical Pharmacologist evaluating novel drug mechanisms

Your perspective:
- New therapies from recent trials may offer better outcomes than standard of care
- Phase II data can inform decisions before Phase III completion
- Early access programs and compassionate use for promising drugs
- Combination approaches being tested at NCI-designated centers
- Balance innovation with realistic assessment of evidence quality

${getWeightModifier(weight)}

Cite recent publications, ASCO/ESMO abstracts, and NCT numbers for relevant trials.
Clearly distinguish between Phase I/II (promising but uncertain) and Phase III (more established) evidence.
This perspective is for patients who want to explore beyond standard guidelines with eyes open about evidence levels.`
  },

  precision: {
    name: 'Molecular/Targeted',
    icon: 'target',
    color: 'purple',
    specialists: ['Molecular Pathologist', 'Cancer Geneticist', 'Targeted Therapy Specialist'],
    getSystemContext: (weight: number) => `You represent the Molecular/Targeted perspective, focused on matching treatment to YOUR tumor's biology.
Your panel includes:
- A Molecular Pathologist analyzing genetic and biomarker profiles
- A Cancer Geneticist interpreting hereditary and somatic mutations
- A Targeted Therapy Specialist matching mutations to drugs

Your perspective:
- Every tumor is unique at the molecular level - treatment should match biology
- Comprehensive genomic profiling (CGP/NGS) often reveals actionable alterations
- Liquid biopsy and ctDNA can track response and detect resistance early
- Biomarkers like MSI-H, TMB, PD-L1 guide immunotherapy decisions
- Targeted drugs (TKIs, ADCs, BiTEs) may work better with fewer side effects than chemo

CRITICAL - VARIANT CLASSIFICATION (you MUST apply these distinctions):
- PATHOGENIC/LIKELY PATHOGENIC mutations → Clinically actionable, can guide therapy
- VUS (Variants of Uncertain Significance) → NOT actionable, do NOT recommend therapy based on VUS
- SNPs (Single Nucleotide Polymorphisms) → Population variants, NOT mutations, NOT actionable
- Benign/Likely Benign variants → NOT actionable

For HRR genes (BRCA1, BRCA2, ATM, PALB2, CHEK2, RAD51C, RAD51D, BARD1):
- Only PATHOGENIC mutations qualify for PARP inhibitors
- SNPs in these genes do NOT indicate HRR deficiency
- A "BRCA variant" or "HRR finding" is NOT the same as a "BRCA mutation" unless classified as pathogenic

Always distinguish:
- Germline (inherited, in all cells) vs Somatic (tumor only)
- If variant classification is unclear, explicitly state this uncertainty

${getWeightModifier(weight)}

Reference specific mutations (EGFR, ALK, BRAF, HER2, KRAS G12C, etc.) and matching targeted therapies.
Explain what tests the patient should ask about (Foundation One, Tempus, Guardant, etc.).
This perspective helps patients understand WHY certain treatments are recommended for their specific tumor.`
  },

  conservative: {
    name: 'Watch & Wait',
    icon: 'clock',
    color: 'amber',
    specialists: ['Active Surveillance Expert', 'Survivorship Specialist', 'Geriatric Oncologist'],
    getSystemContext: (weight: number) => `You represent the Watch & Wait perspective, focused on avoiding overtreatment.
Your panel includes:
- An Active Surveillance Expert experienced in monitoring low-risk cancers
- A Survivorship Specialist aware of late effects and long-term quality of life
- A Geriatric Oncologist considering competing comorbidities

Your perspective:
- Sometimes less is more - avoid overtreatment when possible
- Active surveillance is appropriate for many low-risk cancers (low-grade prostate, thyroid, CLL, etc.)
- Consider long-term quality of life, not just short-term tumor response
- Treatment holidays and de-escalation when disease is controlled
- Second malignancies and late toxicities from treatment can be worse than indolent disease

${getWeightModifier(weight)}

Reference surveillance data (PROTECT trial, etc.), de-escalation studies, and survivorship outcomes.
Discuss quality-adjusted life years and competing risks.
This perspective is for patients who want to avoid unnecessary treatment, especially for slow-growing cancers.`
  },

  integrative: {
    name: 'Whole Person',
    icon: 'leaf',
    color: 'green',
    specialists: ['Integrative Oncologist', 'Exercise Physiologist', 'Palliative Care Specialist'],
    getSystemContext: (weight: number) => `You represent the Whole Person perspective, focused on quality of life and treatment tolerance.
Your panel includes:
- An Integrative Oncologist combining conventional care with evidence-based supportive approaches
- An Exercise Physiologist specializing in exercise oncology
- A Palliative Care Specialist focused on symptom management (not just end-of-life)

Your perspective:
- How to tolerate treatment better (fatigue, nausea, neuropathy management)
- Exercise during treatment improves outcomes and reduces side effects
- Nutrition strategies that support treatment efficacy (not cure cancer, support treatment)
- Mental health: anxiety, depression, and adjustment disorder are common and treatable
- Palliative care is symptom management, not giving up - it improves quality AND quantity of life

${getWeightModifier(weight)}

ONLY recommend approaches with published evidence (RCTs, systematic reviews, ASCO guidelines).
Do NOT recommend unproven therapies like homeopathy, crystals, or supplements without evidence.
This perspective helps patients feel better during treatment and live better as survivors.`
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
  persona: typeof PERSONAS.guidelines,
  personaKey: string,
  caseContext: string,
  phase: 'diagnosis' | 'treatment',
  question: string,
  weight: number,
  userId?: string,
  communicationStyle: CommunicationStyle = 'balanced',
  graphragResult?: OrchestratorResult
): Promise<{
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
  specialists: string[]
  sources?: string[]
}> {
  const phasePrompt = phase === 'diagnosis'
    ? `Analyze this diagnosis. Is it correct and complete? Are there alternative diagnoses to consider? What additional testing might be needed?`
    : `Evaluate treatment options for this patient. What approach would you recommend and why?`

  const systemContext = persona.getSystemContext(weight)
  const styleInstructions = getCommunicationStyleInstructions(communicationStyle)

  // Get GraphRAG context specific to this persona
  const graphragContext = graphragResult
    ? getGraphRAGContextForPersona(personaKey, graphragResult)
    : ''

  const fullPrompt = `${systemContext}

${styleInstructions}

${caseContext}
${graphragContext}

QUESTION: ${question}

${phasePrompt}

Respond in this exact JSON format:
{
  "argument": "Your main argument in 2-3 sentences",
  "evidence": ["Evidence point 1", "Evidence point 2", "Evidence point 3"],
  "confidence": 75,
  "recommendation": "Your specific recommendation in 1-2 sentences"
}

Be specific to THIS patient's case. Reference their actual biomarkers, stage, and findings.
${graphragContext ? 'Cite the provided evidence sources when making claims.' : ''}`

  try {
    // Check for required environment variables
    if (!SUPABASE_URL) {
      console.error('[Combat] Missing SUPABASE_URL')
      throw new Error('Server configuration error: Missing SUPABASE_URL')
    }
    if (!SUPABASE_ANON_KEY) {
      console.error('[Combat] Missing SUPABASE_ANON_KEY')
      throw new Error('Server configuration error: Missing SUPABASE_ANON_KEY')
    }

    console.log(`[Combat] Calling direct-navis for ${persona.name}...`)
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
        userId, // Pass userId for response_evaluations tracking
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response')
      console.error(`[Combat] direct-navis error for ${persona.name}:`, response.status, errorText)
      throw new Error(`direct-navis API error: ${response.status} - ${errorText.slice(0, 200)}`)
    }

    const data = await response.json()
    const text = data.response || data.answer || ''

    // Get sources from GraphRAG for this persona
    const graphragPersonaName = Object.entries(PERSONA_MAP).find(([_, key]) => key === personaKey)?.[0]
    const personaGraphRAG = graphragResult?.results.find(r => r.persona === graphragPersonaName)
    const sources = personaGraphRAG?.sources_used || []

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return { ...parsed, specialists: persona.specialists, sources }
      } catch {
        // Fallback
      }
    }

    return {
      argument: text.slice(0, 300),
      evidence: ['See full analysis'],
      confidence: 70,
      recommendation: 'Consult with your oncologist',
      specialists: persona.specialists,
      sources
    }
  } catch (err) {
    console.error('Persona API error:', err)
    return {
      argument: 'Analysis could not be completed.',
      evidence: ['Error during analysis'],
      confidence: 0,
      recommendation: 'Please try again',
      specialists: persona.specialists,
      sources: []
    }
  }
}

async function synthesizePerspectives(
  perspectives: Array<{ name: string; argument: string; recommendation: string }>,
  phase: 'diagnosis' | 'treatment',
  userId?: string,
  communicationStyle: CommunicationStyle = 'balanced'
): Promise<{
  synthesis: string
  consensus: string[]
  divergence: string[]
}> {
  const perspectiveSummary = perspectives
    .map(p => `${p.name}: ${p.argument}\nRecommendation: ${p.recommendation}`)
    .join('\n\n')

  const styleInstructions = getCommunicationStyleInstructions(communicationStyle)

  // Tailor synthesis format based on communication style
  const synthesisFormat = communicationStyle === 'gentle'
    ? `{
  "headline": "One sentence (max 15 words) in plain language summarizing the key finding",
  "bullets": ["Key point 1 in plain language", "Key point 2", "Key point 3"],
  "consensus": ["Point where perspectives agree, in plain language"],
  "divergence": ["Where perspectives differ, explained simply"]
}`
    : communicationStyle === 'research'
    ? `{
  "headline": "One sentence summarizing the clinical bottom line",
  "synthesis": "2-3 sentences with specific clinical details, citing perspective names",
  "consensus": ["Specific point of agreement with clinical rationale"],
  "divergence": ["Specific disagreement noting which perspectives differ and why"]
}`
    : `{
  "headline": "One sentence summarizing the most important takeaway",
  "synthesis": "2-3 sentences explaining the key findings in accessible language",
  "consensus": ["Point where most/all perspectives agree"],
  "divergence": ["Key disagreement between perspectives"]
}`

  const synthesisPrompt = `${styleInstructions}

Five oncology perspectives have analyzed a cancer case:
1. Standard of Care (NCCN guidelines)
2. Emerging Evidence (clinical trials, cutting edge)
3. Molecular/Targeted (precision medicine)
4. Watch & Wait (conservative, de-escalation)
5. Whole Person (quality of life, integrative)

${perspectiveSummary}

Synthesize ALL FIVE perspectives. Respond in this exact JSON format:
${synthesisFormat}

IMPORTANT:
- The "headline" field is the most important - make it actionable and clear
- Be specific about which perspectives agree or disagree
- Focus on what the patient should discuss with their oncologist`

  try {
    console.log('[Combat] Calling direct-navis for synthesis...')
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
        userId, // Pass userId for response_evaluations tracking
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response')
      console.error('[Combat] direct-navis synthesis error:', response.status, errorText)
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

// Communication style adjustments for AI responses
type CommunicationStyle = 'gentle' | 'balanced' | 'research'

function getCommunicationStyleInstructions(style: CommunicationStyle): string {
  switch (style) {
    case 'gentle':
      return `COMMUNICATION STYLE: GENTLE (Grade 6-8 reading level)

WRITING RULES:
- Maximum 15 words per sentence
- Use bullet points, not paragraphs
- NO medical jargon - use plain language alternatives:
  • "spread" not "metastasis"
  • "tissue sample" not "biopsy"
  • "gene change" not "mutation"
  • "imaging scan" not "PET-CT"
- NO statistics, percentages, or survival numbers
- Focus on: what to do next, who to talk to, what questions to ask
- Tone: Warm, reassuring, like explaining to a worried family member
- Always end with encouragement and clear next steps

FORMAT:
• Use short bullet points
• Bold the most important action items
• Include "Questions for your doctor" as simple yes/no questions`

    case 'research':
      return `COMMUNICATION STYLE: RESEARCH (College+ reading level, medical literacy assumed)

WRITING RULES:
- Use precise medical terminology without explanation
- Include specific citations: NCT numbers, PMID references, trial names
- Provide statistical details: hazard ratios (HR), confidence intervals (95% CI), p-values
- Discuss mechanism of action for each treatment option
- Include level of evidence (Phase I/II/III, retrospective, meta-analysis)
- Note limitations, caveats, and conflicting data
- Compare response rates, PFS, OS across options
- Reference specific mutations/biomarkers and matching drugs

FORMAT:
• Use structured paragraphs with clinical detail
• Include a "Key Evidence" section with citations
• Note "Data Quality" for each recommendation (strong/moderate/limited evidence)
• Include "What We Don't Know Yet" section for emerging questions`

    case 'balanced':
    default:
      return `COMMUNICATION STYLE: BALANCED (Grade 10-12 reading level)

WRITING RULES:
- Use medical terms but define them on first use: "metastasis (cancer spread)"
- Include key statistics in plain language: "about 7 out of 10 patients respond"
- Mix of bullet points and short paragraphs
- Explain WHY something is recommended, not just what
- Mention relevant trials by name but don't cite PMIDs
- Be informative but not overwhelming - 3-4 key points per perspective

FORMAT:
• Lead with the bottom line recommendation
• Support with 2-3 evidence points
• Include "Ask Your Oncologist" questions
• Note any important caveats simply`
  }
}

// Correction type from verification step
interface FindingCorrection {
  findingId: string
  originalValue: string
  correctedValue: string
  correctionType: 'wrong' | 'incomplete' | 'misclassified'
  note?: string
}

// Detected finding for verification step
interface DetectedFinding {
  id: string
  category: 'biomarker' | 'mutation' | 'diagnosis' | 'stage' | 'treatment'
  label: string
  value: string
  source: string
  confidence: 'high' | 'medium' | 'low'
  clinicalNote?: string
}

// Extract verifiable findings from records for the verification step
function extractVerifiableFindings(records: RecordInput[]): DetectedFinding[] {
  const findings: DetectedFinding[] = []
  let idCounter = 0

  for (const record of records) {
    const source = record.fileName || record.documentType || 'Unknown document'
    const cs = record.result?.cancer_specific

    // Extract diagnosis
    if (cs?.cancer_type) {
      findings.push({
        id: `finding-${idCounter++}`,
        category: 'diagnosis',
        label: 'Cancer Type',
        value: cs.cancer_type,
        source,
        confidence: 'high',
      })
    }

    // Extract stage
    if (cs?.stage) {
      findings.push({
        id: `finding-${idCounter++}`,
        category: 'stage',
        label: 'Stage',
        value: cs.stage,
        source,
        confidence: 'high',
      })
    }

    // Extract grade
    if (cs?.grade) {
      findings.push({
        id: `finding-${idCounter++}`,
        category: 'stage',
        label: 'Grade',
        value: cs.grade,
        source,
        confidence: 'high',
      })
    }

    // Extract biomarkers - these are critical for verification
    if (cs?.biomarkers && cs.biomarkers.length > 0) {
      for (const biomarker of cs.biomarkers) {
        // Determine category and clinical note based on biomarker type
        const upperBiomarker = biomarker.toUpperCase()
        let category: 'biomarker' | 'mutation' = 'biomarker'
        let clinicalNote: string | undefined
        let confidence: 'high' | 'medium' | 'low' = 'high'

        // HRR genes - flag for special attention
        if (/\b(BRCA|ATM|PALB2|CHEK2|RAD51|CDK12|FANCA|HRR)\b/.test(upperBiomarker)) {
          category = 'mutation'
          clinicalNote = 'If pathogenic, may qualify for PARP inhibitor therapy. Please verify this is a pathogenic mutation vs SNP/VUS.'
          confidence = 'medium' // Flag for verification
        }
        // HER2
        else if (/\bHER2\b/.test(upperBiomarker)) {
          clinicalNote = 'HER2 status determines eligibility for targeted therapies like trastuzumab or T-DXd.'
        }
        // MSI/MMR
        else if (/\b(MSI|MMR|dMMR)\b/.test(upperBiomarker)) {
          clinicalNote = 'MSI-High/dMMR tumors often respond to immunotherapy.'
        }
        // PD-L1
        else if (/\bPD-?L1\b/.test(upperBiomarker)) {
          clinicalNote = 'PD-L1 expression level influences immunotherapy decisions.'
        }
        // Lung cancer mutations
        else if (/\b(EGFR|ALK|ROS1|KRAS|RET|MET|NTRK|BRAF)\b/.test(upperBiomarker)) {
          category = 'mutation'
          clinicalNote = 'If positive, targeted therapy options may be available.'
        }

        findings.push({
          id: `finding-${idCounter++}`,
          category,
          label: extractBiomarkerLabel(biomarker),
          value: biomarker,
          source,
          confidence,
          clinicalNote,
        })
      }
    }

    // Extract diagnoses array
    if (record.result?.diagnosis && record.result.diagnosis.length > 0) {
      for (const dx of record.result.diagnosis) {
        // Skip if we already captured this as cancer_type
        if (dx === cs?.cancer_type) continue
        findings.push({
          id: `finding-${idCounter++}`,
          category: 'diagnosis',
          label: 'Diagnosis',
          value: dx,
          source,
          confidence: 'high',
        })
      }
    }
  }

  // Dedupe findings by value
  const seen = new Set<string>()
  return findings.filter(f => {
    const key = `${f.category}-${f.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Extract a clean label from biomarker string
function extractBiomarkerLabel(biomarker: string): string {
  // Extract gene name from strings like "BRCA1 positive" or "HER2 3+"
  const match = biomarker.match(/^([A-Z0-9-]+)/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return biomarker.split(/[\s:]/)[0]
}

// Build correction context for the analysis
function buildCorrectionContext(corrections: FindingCorrection[]): string {
  if (!corrections || corrections.length === 0) return ''

  const correctionLines = corrections.map(c => {
    let line = `- "${c.originalValue}" is INCORRECT. Correct value: "${c.correctedValue}"`
    if (c.note) line += ` (Note: ${c.note})`
    return line
  })

  return `
⚠️ CRITICAL PATIENT CORRECTIONS - YOU MUST APPLY THESE:
The patient has verified their records and provided these corrections:
${correctionLines.join('\n')}

IMPORTANT: These corrections OVERRIDE what appears in the records. Adjust your analysis accordingly.
Do NOT recommend treatments based on the incorrect original values.
`
}

export async function POST(request: NextRequest) {
  console.log('[Combat] POST request received')
  try {
    // Rate limiting - AI routes are expensive
    const clientId = getClientIdentifier(request)
    const rateLimit = checkRateLimit(`combat:${clientId}`, RATE_LIMITS.ai)
    if (!rateLimit.success) {
      console.log('[Combat] Rate limited:', clientId)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making another request.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { phase, records, weights, userId, sessionId, communicationStyle, corrections, verifyFirst } = body
    console.log('[Combat] Parsed request:', { phase, recordCount: records?.length, verifyFirst, hasWeights: !!weights })

    if (!records || records.length === 0) {
      console.log('[Combat] No records provided')
      return NextResponse.json({ error: 'No records provided' }, { status: 400 })
    }

    // Extract findings for verification step
    const detectedFindings = extractVerifiableFindings(records)

    // If verifyFirst is true, just return findings without running full analysis
    // This supports the verification-first flow
    if (verifyFirst) {
      return NextResponse.json({
        phase: 'verification',
        findings: detectedFindings,
        recordCount: records.length,
      })
    }

    // Default weights if not provided (balanced = 50 for all)
    const perspectiveWeights: PerspectiveWeights = {
      guidelines: weights?.guidelines ?? 50,
      aggressive: weights?.aggressive ?? 50,
      precision: weights?.precision ?? 50,
      conservative: weights?.conservative ?? 50,
      integrative: weights?.integrative ?? 50
    }

    // Build PCO from records + database entities (GraphRAG Layer 1: Graph Traversal)
    console.log('[Combat] Building PCO from records + database...')
    const pco = await buildPCOFromRecords(records, userId, sessionId)
    console.log('[Combat] PCO built:', {
      diagnoses: pco.diagnoses.length,
      biomarkers: pco.biomarkers.length,
      treatments: pco.treatments.length
    })

    // Run GraphRAG orchestration (Layer 2: Specialized RAG per persona)
    const cancerType = records[0]?.result?.cancer_specific?.cancer_type || 'this cancer'
    const stage = records[0]?.result?.cancer_specific?.stage
    const baseQuestion = phase === 'diagnosis'
      ? `Is the diagnosis of ${cancerType}${stage ? ` (${stage})` : ''} correct and complete?`
      : `What are the best treatment options for ${cancerType}${stage ? ` ${stage}` : ''}?`

    console.log('[Combat] Running GraphRAG orchestration...')
    let graphragResult: OrchestratorResult | undefined
    try {
      graphragResult = await orchestratePersonaRAG(pco, baseQuestion, { timeout: 15000 })
      console.log('[Combat] GraphRAG complete:', {
        successful_retrievals: graphragResult.successful_retrievals,
        total_chunks: graphragResult.total_chunks,
        confidence: graphragResult.combined_confidence
      })
    } catch (err) {
      console.error('[Combat] GraphRAG failed, continuing without:', err)
      // Continue without GraphRAG - graceful degradation
    }

    // Build case context from current records
    let caseContext = buildCaseContext(records)

    // Apply patient corrections if provided (from verification step)
    const correctionContext = buildCorrectionContext(corrections as FindingCorrection[] || [])
    if (correctionContext) {
      caseContext = `${correctionContext}

${caseContext}`
    }

    // Add PCO summary to case context (replaces old graphContext)
    if (pco.has_diagnosis || pco.has_biomarkers || pco.has_treatments) {
      const pcoSummary: string[] = ['PATIENT CONTEXT FROM KNOWLEDGE GRAPH:']
      if (pco.diagnoses.length > 0) {
        pcoSummary.push(`• Diagnoses: ${pco.diagnoses.map(d => `${d.cancer_type}${d.stage ? ` (${d.stage})` : ''}`).join(', ')}`)
      }
      if (pco.biomarkers.length > 0) {
        const positiveBMs = pco.biomarkers.filter(b => b.result_type === 'positive')
        if (positiveBMs.length > 0) {
          pcoSummary.push(`• Positive Biomarkers: ${positiveBMs.map(b => b.name).join(', ')}`)
        }
      }
      if (pco.treatments.length > 0) {
        pcoSummary.push(`• Treatments: ${pco.treatments.map(t => `${t.name} (${t.status})`).join(', ')}`)
      }
      caseContext = `${pcoSummary.join('\n')}

CURRENT RECORDS FOR ANALYSIS:
${caseContext}`
    }

    // Use the question we already built for GraphRAG
    const question = phase === 'diagnosis'
      ? `${baseQuestion} What should be confirmed or explored?`
      : baseQuestion

    // Get the communication style preference (default to balanced)
    const style: CommunicationStyle = communicationStyle || 'balanced'

    console.log('[Combat] Starting 5 perspective calls in parallel...')
    console.log('[Combat] Weights:', perspectiveWeights)
    console.log('[Combat] GraphRAG available:', !!graphragResult)

    // Get all five perspectives in parallel, passing their respective weights, communication style, and GraphRAG context
    const [guidelinesResponse, aggressiveResponse, precisionResponse, conservativeResponse, integrativeResponse] = await Promise.all([
      getPersonaPerspective(PERSONAS.guidelines, 'guidelines', caseContext, phase, question, perspectiveWeights.guidelines, userId, style, graphragResult),
      getPersonaPerspective(PERSONAS.aggressive, 'aggressive', caseContext, phase, question, perspectiveWeights.aggressive, userId, style, graphragResult),
      getPersonaPerspective(PERSONAS.precision, 'precision', caseContext, phase, question, perspectiveWeights.precision, userId, style, graphragResult),
      getPersonaPerspective(PERSONAS.conservative, 'conservative', caseContext, phase, question, perspectiveWeights.conservative, userId, style, graphragResult),
      getPersonaPerspective(PERSONAS.integrative, 'integrative', caseContext, phase, question, perspectiveWeights.integrative, userId, style, graphragResult)
    ])

    console.log('[Combat] All 5 perspectives completed')

    const perspectives = [
      { name: PERSONAS.guidelines.name, icon: 'shield' as const, color: 'blue', weight: perspectiveWeights.guidelines, ...guidelinesResponse },
      { name: PERSONAS.aggressive.name, icon: 'swords' as const, color: 'red', weight: perspectiveWeights.aggressive, ...aggressiveResponse },
      { name: PERSONAS.precision.name, icon: 'target' as const, color: 'purple', weight: perspectiveWeights.precision, ...precisionResponse },
      { name: PERSONAS.conservative.name, icon: 'clock' as const, color: 'amber', weight: perspectiveWeights.conservative, ...conservativeResponse },
      { name: PERSONAS.integrative.name, icon: 'leaf' as const, color: 'green', weight: perspectiveWeights.integrative, ...integrativeResponse }
    ]

    // Synthesize the perspectives
    const synthesis = await synthesizePerspectives(
      perspectives.map(p => ({ name: p.name, argument: p.argument, recommendation: p.recommendation })),
      phase,
      userId,
      style
    )

    // Generate tool recommendation based on the analysis context
    // For Combat, recommend based on what they might want to do next
    const toolRecommendation = recommendTool(question, pco, {
      isAuthenticated: !!userId,
      currentPage: '/combat', // Don't recommend Combat on Combat page
    })

    const result = {
      phase,
      question,
      perspectives,
      ...synthesis,
      // Include findings for reference (already verified if corrections were applied)
      detectedFindings,
      // Flag if this was a re-run with corrections
      hasCorrections: corrections && corrections.length > 0,
      correctionsApplied: corrections || [],
      // GraphRAG metadata
      graphrag: graphragResult ? {
        successful_retrievals: graphragResult.successful_retrievals,
        total_chunks: graphragResult.total_chunks,
        combined_confidence: graphragResult.combined_confidence,
        retrieval_time_ms: graphragResult.total_time_ms
      } : null,
      // PCO summary for transparency
      patientContext: {
        diagnoses: pco.diagnoses.length,
        biomarkers: pco.biomarkers.length,
        treatments: pco.treatments.length,
        completeness: pco.completeness_score
      },
      // Tool recommendation for discovery
      ...formatRecommendationForResponse(toolRecommendation),
    }

    return NextResponse.json(result)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    console.error('Combat API error:', { message: errorMessage, stack: errorStack })
    return NextResponse.json({
      error: 'Combat analysis failed',
      details: errorMessage,
      // Only include stack in non-production for debugging
      ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
    }, { status: 500 })
  }
}

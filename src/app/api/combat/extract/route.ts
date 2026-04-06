import { NextRequest, NextResponse } from 'next/server'

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

interface DetectedFinding {
  id: string
  category: 'biomarker' | 'mutation' | 'diagnosis' | 'stage' | 'treatment'
  label: string
  value: string
  source: string
  confidence: 'high' | 'medium' | 'low'
  clinicalNote?: string
}

/**
 * Extract verifiable findings from patient records
 * This runs BEFORE the main combat analysis to allow user verification
 */
export async function POST(request: NextRequest) {
  try {
    const { records } = await request.json()

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 })
    }

    // Build context from records
    const recordSummary = records.map((r: RecordInput) => {
      const parts = [`Document: ${r.fileName} (${r.documentType})`]
      if (r.result?.cancer_specific) {
        const cs = r.result.cancer_specific
        if (cs.cancer_type) parts.push(`Cancer Type: ${cs.cancer_type}`)
        if (cs.stage) parts.push(`Stage: ${cs.stage}`)
        if (cs.grade) parts.push(`Grade: ${cs.grade}`)
        if (cs.biomarkers?.length) parts.push(`Biomarkers: ${cs.biomarkers.join(', ')}`)
      }
      if (r.result?.diagnosis?.length) {
        parts.push(`Diagnoses: ${r.result.diagnosis.join('; ')}`)
      }
      if (r.documentText) {
        parts.push(`Text excerpt: ${r.documentText.slice(0, 1500)}`)
      }
      return parts.join('\n')
    }).join('\n\n---\n\n')

    const extractionPrompt = `You are a clinical data extraction assistant. Extract key verifiable findings from these patient records.

PATIENT RECORDS:
${recordSummary}

Extract findings in these categories:
1. BIOMARKERS - HER2, PD-L1, ER/PR status, MSI status, etc.
2. MUTATIONS/GENETIC FINDINGS - BRCA, EGFR, KRAS, HRR genes, etc.
   IMPORTANT: Distinguish between:
   - Pathogenic mutations (clinically actionable)
   - VUS (variants of uncertain significance) - NOT actionable
   - SNPs/polymorphisms - population variants, NOT the same as mutations
   - Germline (inherited) vs Somatic (tumor only)
3. DIAGNOSIS - Cancer type, histology
4. STAGE - TNM staging, clinical stage
5. TREATMENTS - Current or past treatments mentioned

For each finding, assess confidence:
- HIGH: Explicitly stated with clear values
- MEDIUM: Mentioned but details unclear
- LOW: Inferred or ambiguous

Return valid JSON with this exact structure:
{
  "findings": [
    {
      "id": "unique-id-1",
      "category": "mutation",
      "label": "BRCA1 Status",
      "value": "Pathogenic mutation detected",
      "source": "Genetic Testing Report.pdf",
      "confidence": "high",
      "clinicalNote": "May qualify for PARP inhibitor therapy"
    },
    {
      "id": "unique-id-2",
      "category": "biomarker",
      "label": "HER2 Expression",
      "value": "HER2-Low (IHC 1+)",
      "source": "Pathology Report.pdf",
      "confidence": "high",
      "clinicalNote": "May qualify for T-DXd (Enhertu)"
    }
  ]
}

CRITICAL RULES:
- If a genetic finding mentions "SNP", "polymorphism", or "benign variant", mark it clearly as such - do NOT classify as pathogenic
- If HRR genes (BRCA1, BRCA2, ATM, PALB2, CHEK2, etc.) are mentioned, be explicit about whether they are PATHOGENIC MUTATIONS vs SNPs/VUS
- Include clinical notes about actionability ONLY for pathogenic findings
- Use the actual document name as the source
- Generate unique IDs like "finding-1", "finding-2", etc.
- Only include findings that are explicitly mentioned or strongly implied
- If uncertain whether something is pathogenic, note this in the value`

    const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: extractionPrompt,
        model: 'claude-sonnet-4-20250514',
        temperature: 0.1, // Low temp for extraction accuracy
        skipRAG: true,
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
        return NextResponse.json({
          findings: parsed.findings || [],
          recordCount: records.length,
        })
      } catch {
        console.error('JSON parse error in extraction')
      }
    }

    // Fallback: extract basic findings from structured data
    const fallbackFindings: DetectedFinding[] = []
    let findingId = 1

    for (const record of records) {
      const r = record as RecordInput
      if (r.result?.cancer_specific) {
        const cs = r.result.cancer_specific

        if (cs.cancer_type) {
          fallbackFindings.push({
            id: `finding-${findingId++}`,
            category: 'diagnosis',
            label: 'Cancer Type',
            value: cs.cancer_type,
            source: r.fileName,
            confidence: 'high',
          })
        }

        if (cs.stage) {
          fallbackFindings.push({
            id: `finding-${findingId++}`,
            category: 'stage',
            label: 'Stage',
            value: cs.stage,
            source: r.fileName,
            confidence: 'high',
          })
        }

        if (cs.biomarkers?.length) {
          for (const biomarker of cs.biomarkers) {
            fallbackFindings.push({
              id: `finding-${findingId++}`,
              category: 'biomarker',
              label: 'Biomarker',
              value: biomarker,
              source: r.fileName,
              confidence: 'medium',
            })
          }
        }
      }
    }

    return NextResponse.json({
      findings: fallbackFindings,
      recordCount: records.length,
    })

  } catch (err) {
    console.error('Extraction API error:', err)
    return NextResponse.json({ error: 'Failed to extract findings' }, { status: 500 })
  }
}

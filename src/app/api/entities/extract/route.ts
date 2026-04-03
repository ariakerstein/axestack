import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Entity types we extract
type EntityType =
  | 'diagnosis'
  | 'biomarker'
  | 'treatment'
  | 'medication'
  | 'procedure'
  | 'lab_result'
  | 'provider'
  | 'institution'
  | 'symptom'
  | 'vital_sign'

interface ExtractedEntity {
  entity_type: EntityType
  entity_value: string
  entity_date?: string
  entity_status?: string
  numeric_value?: number
  numeric_unit?: string
  reference_range?: string
  source_text?: string
  confidence: number
  metadata?: Record<string, unknown>
}

interface ExtractionResult {
  entities: ExtractedEntity[]
  relationships: {
    entity_a_value: string
    relationship_type: string
    entity_b_value: string
  }[]
}

const EXTRACTION_PROMPT = `You are a medical entity extraction system. Extract structured entities from the following medical record translation.

ENTITY TYPES TO EXTRACT:
- diagnosis: Cancer types, staging, grades, histology (e.g., "Stage IIA invasive ductal carcinoma")
- biomarker: Genetic markers, protein expression (e.g., "EGFR exon 19 deletion positive", "ER+/PR+/HER2-", "Ki-67 18%")
- treatment: Therapies, regimens (e.g., "Osimertinib 80mg daily", "FOLFOX chemotherapy")
- medication: Drugs prescribed (e.g., "Ondansetron 8mg PRN")
- procedure: Surgeries, biopsies (e.g., "Lumpectomy", "CT-guided biopsy")
- lab_result: Blood tests, tumor markers (e.g., "PSA 8.2 ng/mL", "WBC 5.4 K/uL")
- provider: Doctor names with specialty if available (e.g., "Dr. Sarah Chen, Medical Oncologist")
- institution: Hospitals, clinics (e.g., "UCSF Helen Diller Cancer Center")
- symptom: Patient-reported symptoms (e.g., "fatigue", "neuropathy grade 2")
- vital_sign: Weight, BP, temperature (e.g., "BP 128/82", "Weight 165 lbs")

RELATIONSHIPS TO IDENTIFY:
- treated_with: diagnosis -> treatment
- indicates: biomarker -> diagnosis
- monitored_by: biomarker -> lab_result
- performed_at: procedure -> institution
- prescribed_by: medication -> provider
- caused_by: symptom -> treatment (side effects)

OUTPUT FORMAT (JSON):
{
  "entities": [
    {
      "entity_type": "diagnosis",
      "entity_value": "Stage IIA invasive ductal carcinoma",
      "entity_date": "2024-01-15",
      "entity_status": "confirmed",
      "confidence": 0.95,
      "source_text": "Pathology confirms Stage IIA invasive ductal carcinoma"
    },
    {
      "entity_type": "biomarker",
      "entity_value": "ER positive",
      "entity_status": "positive",
      "numeric_value": 95,
      "numeric_unit": "%",
      "confidence": 0.98,
      "source_text": "ER 95% positive"
    },
    {
      "entity_type": "lab_result",
      "entity_value": "PSA",
      "numeric_value": 8.2,
      "numeric_unit": "ng/mL",
      "reference_range": "0-4 ng/mL",
      "entity_status": "elevated",
      "entity_date": "2024-01-10",
      "confidence": 0.99
    }
  ],
  "relationships": [
    {
      "entity_a_value": "Stage IIA invasive ductal carcinoma",
      "relationship_type": "treated_with",
      "entity_b_value": "Tamoxifen 20mg daily"
    }
  ]
}

RULES:
1. Extract ALL medical entities, even if they seem minor
2. Include exact dates when available (YYYY-MM-DD format)
3. For lab values, always extract numeric_value, numeric_unit, and reference_range if available
4. Set confidence 0.9+ for explicit mentions, 0.7-0.9 for inferred, <0.7 for uncertain
5. Include source_text showing the exact phrase the entity was extracted from
6. Identify relationships between entities where clear connections exist

MEDICAL RECORD TO ANALYZE:
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      translationResult,  // The structured translation from translate API
      documentText,       // Raw document text
      recordId,          // medical_records.id if available
      sessionId,
      userId
    } = body

    if (!translationResult && !documentText) {
      return NextResponse.json({ error: 'translationResult or documentText required' }, { status: 400 })
    }

    // Build context for extraction
    let extractionContext = ''

    if (translationResult) {
      extractionContext = `
DOCUMENT TYPE: ${translationResult.document_type || 'Unknown'}
PATIENT: ${translationResult.patient_name || 'Unknown'}
DATE OF SERVICE: ${translationResult.date_of_service || 'Unknown'}
PROVIDER: ${translationResult.provider_name || 'Unknown'}
INSTITUTION: ${translationResult.institution || 'Unknown'}

DIAGNOSIS: ${JSON.stringify(translationResult.diagnosis || [])}

CANCER DETAILS:
- Type: ${translationResult.cancer_specific?.cancer_type || 'Unknown'}
- Stage: ${translationResult.cancer_specific?.stage || 'Unknown'}
- Grade: ${translationResult.cancer_specific?.grade || 'Unknown'}
- Biomarkers: ${JSON.stringify(translationResult.cancer_specific?.biomarkers || [])}
- Treatment Timeline: ${translationResult.cancer_specific?.treatment_timeline || 'Unknown'}

TEST SUMMARY: ${translationResult.test_summary || 'None'}

LAB VALUES:
${JSON.stringify(translationResult.lab_values?.key_results || [], null, 2)}

RECOMMENDED NEXT STEPS: ${JSON.stringify(translationResult.recommended_next_steps || [])}

TECHNICAL TERMS: ${JSON.stringify(translationResult.technical_terms_explained || [])}
`
    }

    if (documentText) {
      extractionContext += `\n\nRAW DOCUMENT TEXT:\n${documentText.slice(0, 8000)}`
    }

    // Call Claude for entity extraction
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + extractionContext
        }
      ]
    })

    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    let extractionResult: ExtractionResult
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractionResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse extraction response:', parseError)
      return NextResponse.json({
        error: 'Failed to parse extraction result',
        rawResponse: responseText.slice(0, 500)
      }, { status: 500 })
    }

    // Store entities in database
    const supabase = getSupabase()
    const insertedEntities: { id: string; entity_value: string }[] = []

    if (extractionResult.entities && extractionResult.entities.length > 0) {
      for (const entity of extractionResult.entities) {
        const { data, error } = await supabase
          .from('patient_entities')
          .insert({
            user_id: userId || null,
            session_id: sessionId || null,
            entity_type: entity.entity_type,
            entity_value: entity.entity_value,
            entity_date: entity.entity_date || null,
            entity_status: entity.entity_status || null,
            numeric_value: entity.numeric_value || null,
            numeric_unit: entity.numeric_unit || null,
            reference_range: entity.reference_range || null,
            source_record_id: recordId || null,
            source_text: entity.source_text || null,
            confidence: entity.confidence || 0.9,
            metadata: entity.metadata || {}
          })
          .select('id, entity_value')
          .single()

        if (error) {
          console.error('Error inserting entity:', error)
        } else if (data) {
          insertedEntities.push(data)
        }
      }

      // Store relationships
      if (extractionResult.relationships && extractionResult.relationships.length > 0) {
        for (const rel of extractionResult.relationships) {
          // Find the entity IDs
          const entityA = insertedEntities.find(e => e.entity_value === rel.entity_a_value)
          const entityB = insertedEntities.find(e => e.entity_value === rel.entity_b_value)

          if (entityA && entityB) {
            await supabase
              .from('entity_relationships')
              .insert({
                entity_a_id: entityA.id,
                entity_b_id: entityB.id,
                relationship_type: rel.relationship_type,
                confidence: 0.9
              })
          }
        }
      }
    }

    // Mark any existing summaries as stale
    if (userId || sessionId) {
      await supabase
        .from('patient_summaries')
        .update({ is_stale: true })
        .or(`user_id.eq.${userId || 'null'},session_id.eq.${sessionId || 'null'}`)
    }

    return NextResponse.json({
      success: true,
      entities_extracted: extractionResult.entities?.length || 0,
      relationships_extracted: extractionResult.relationships?.length || 0,
      entities: extractionResult.entities,
      relationships: extractionResult.relationships
    })

  } catch (err) {
    console.error('Entity extraction error:', err)
    return NextResponse.json({
      error: 'Extraction failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

// GET - Fetch entities for a patient
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')
  const entityType = searchParams.get('type')

  if (!sessionId && !userId) {
    return NextResponse.json({ error: 'sessionId or userId required' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    let query = supabase
      .from('patient_entities')
      .select('*')
      .order('entity_date', { ascending: false, nullsFirst: false })

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('Error fetching entities:', error)
      return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
    }

    // Group by entity type for easier consumption
    const grouped: Record<string, typeof data> = {}
    for (const entity of data || []) {
      if (!grouped[entity.entity_type]) {
        grouped[entity.entity_type] = []
      }
      grouped[entity.entity_type].push(entity)
    }

    return NextResponse.json({
      entities: data,
      grouped,
      count: data?.length || 0
    })

  } catch (err) {
    console.error('Error in entities API:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

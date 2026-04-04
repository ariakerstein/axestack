import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

const EXTRACTION_PROMPT = `You are a medical entity extraction system. Extract structured entities from the following medical record.

ENTITY TYPES TO EXTRACT:
- diagnosis: Cancer types, staging, grades, histology
- biomarker: Genetic markers, protein expression (EGFR, BRCA, ER/PR/HER2, PSA, Ki-67)
- treatment: Therapies, regimens, drugs
- procedure: Surgeries, biopsies
- lab_result: Blood tests, tumor markers with values
- provider: Doctor names
- institution: Hospitals, clinics

OUTPUT FORMAT (JSON only, no other text):
{
  "entities": [
    {
      "entity_type": "diagnosis",
      "entity_value": "prostate cancer",
      "confidence": 0.95
    }
  ]
}

RULES:
1. Extract ALL medical entities
2. Normalize values (lowercase, remove extra spaces)
3. Set confidence 0.9+ for explicit mentions
4. Focus on cancer-related entities

MEDICAL RECORD:
`

interface ExtractedEntity {
  entity_type: string
  entity_value: string
  confidence: number
}

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || 'opencancer-admin-2024'
  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const dryRun = searchParams.get('dryRun') === 'true'

  try {
    const supabase = getSupabase()

    // Get records that haven't been processed yet
    // We'll check if entities already exist for each record
    const { data: existingEntityRecords } = await supabase
      .from('patient_entities')
      .select('source_record_id')
      .not('source_record_id', 'is', null)

    const processedRecordIds = new Set(
      existingEntityRecords?.map(e => e.source_record_id) || []
    )

    // Get all medical_records (the actual records table)
    const { data: records, error: recordsError } = await supabase
      .from('medical_records')
      .select('id, user_id, original_name, record_type, ai_analysis, extracted_text, created_at')
      .eq('source', 'opencancer')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (recordsError) {
      return NextResponse.json({ error: 'Failed to fetch records', details: recordsError }, { status: 500 })
    }

    // Filter to unprocessed records
    const unprocessedRecords = records?.filter(r => !processedRecordIds.has(r.id)) || []

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalRecords: records?.length || 0,
        alreadyProcessed: (records?.length || 0) - unprocessedRecords.length,
        toProcess: unprocessedRecords.length,
        sampleRecords: unprocessedRecords.slice(0, 5).map(r => ({
          id: r.id,
          fileName: r.original_name,
          userId: r.user_id?.substring(0, 8)
        }))
      })
    }

    const anthropic = new Anthropic()
    const results: Array<{
      recordId: string
      fileName: string
      entitiesExtracted: number
      error?: string
    }> = []

    // Process each record
    for (const record of unprocessedRecords) {
      try {
        // Get the translation result from ai_analysis
        const translationResult = record.ai_analysis

        if (!translationResult) {
          results.push({
            recordId: record.id,
            fileName: record.original_name,
            entitiesExtracted: 0,
            error: 'No translation data found'
          })
          continue
        }

        // Build context for extraction
        let extractionContext = ''
        if (typeof translationResult === 'object') {
          extractionContext = `
DOCUMENT TYPE: ${translationResult.document_type || 'Unknown'}
DIAGNOSIS: ${JSON.stringify(translationResult.diagnosis || [])}
CANCER TYPE: ${translationResult.cancer_specific?.cancer_type || 'Unknown'}
STAGE: ${translationResult.cancer_specific?.stage || 'Unknown'}
BIOMARKERS: ${JSON.stringify(translationResult.cancer_specific?.biomarkers || [])}
TREATMENT: ${translationResult.cancer_specific?.treatment_timeline || 'Unknown'}
LAB VALUES: ${JSON.stringify(translationResult.lab_values?.key_results || [])}
PLAIN SUMMARY: ${translationResult.plain_english_summary || ''}
`
        } else {
          extractionContext = String(translationResult).slice(0, 4000)
        }

        // Call Claude for extraction
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: EXTRACTION_PROMPT + extractionContext
            }
          ]
        })

        const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

        // Parse entities
        let entities: ExtractedEntity[] = []
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            entities = parsed.entities || []
          }
        } catch {
          results.push({
            recordId: record.id,
            fileName: record.original_name,
            entitiesExtracted: 0,
            error: 'Failed to parse extraction result'
          })
          continue
        }

        // Insert entities
        let insertedCount = 0
        for (const entity of entities) {
          const { error: insertError } = await supabase
            .from('patient_entities')
            .insert({
              user_id: record.user_id || null,
              entity_type: entity.entity_type,
              entity_value: entity.entity_value.toLowerCase().trim(),
              source_record_id: record.id,
              confidence: entity.confidence || 0.9,
              metadata: {}
            })

          if (!insertError) {
            insertedCount++
          }
        }

        results.push({
          recordId: record.id,
          fileName: record.original_name,
          entitiesExtracted: insertedCount
        })

        // Rate limit - wait 500ms between API calls
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (err) {
        results.push({
          recordId: record.id,
          fileName: record.original_name,
          entitiesExtracted: 0,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    const totalExtracted = results.reduce((sum, r) => sum + r.entitiesExtracted, 0)
    const successCount = results.filter(r => r.entitiesExtracted > 0).length
    const errorCount = results.filter(r => r.error).length

    return NextResponse.json({
      success: true,
      processed: results.length,
      totalEntitiesExtracted: totalExtracted,
      successCount,
      errorCount,
      results: results.slice(0, 20) // Return first 20 for brevity
    })

  } catch (err) {
    console.error('Batch extraction error:', err)
    return NextResponse.json({
      error: 'Batch extraction failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

// GET - Check status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_KEY || 'opencancer-admin-2024'
  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Count total records
    const { count: totalRecords } = await supabase
      .from('medical_records')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'opencancer')

    // Count records with entities extracted
    const { data: entityRecords } = await supabase
      .from('patient_entities')
      .select('source_record_id')
      .not('source_record_id', 'is', null)

    const processedRecordIds = new Set(
      entityRecords?.map(e => e.source_record_id) || []
    )

    // Count total entities
    const { count: totalEntities } = await supabase
      .from('patient_entities')
      .select('*', { count: 'exact', head: true })

    // Count unique patients with entities
    const { data: uniquePatients } = await supabase
      .from('patient_entities')
      .select('user_id')
      .not('user_id', 'is', null)

    const uniquePatientCount = new Set(
      uniquePatients?.map(e => e.user_id) || []
    ).size

    return NextResponse.json({
      totalRecords: totalRecords || 0,
      recordsWithEntities: processedRecordIds.size,
      recordsRemaining: (totalRecords || 0) - processedRecordIds.size,
      totalEntities: totalEntities || 0,
      uniquePatientsWithEntities: uniquePatientCount
    })

  } catch (err) {
    return NextResponse.json({
      error: 'Status check failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

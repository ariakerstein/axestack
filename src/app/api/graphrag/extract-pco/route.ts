/**
 * GraphRAG PCO Extraction API
 *
 * POST: Extract a Patient Context Object for a user/session
 * GET: Check if sufficient data exists for PCO extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractPCO, hasSufficientData, extractMinimalPCO } from '@/lib/graphrag/pco-extractor'
import { getPatientGraphStats } from '@/lib/graphrag/graph-traverser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      sessionId,
      maxHops = 2,
      includeRelatedEntities = true,
      minimal = false
    } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Check if there's enough data
    const hasData = await hasSufficientData(userId, sessionId)
    if (!hasData) {
      return NextResponse.json({
        success: true,
        hasSufficientData: false,
        pco: null,
        message: 'Not enough patient data to generate a meaningful PCO. Upload medical records or complete your profile.'
      })
    }

    // Extract PCO
    const startTime = Date.now()

    const pco = minimal
      ? await extractMinimalPCO({ userId, sessionId })
      : await extractPCO({
          userId,
          sessionId,
          includeRelatedEntities,
          traversalConfig: {
            max_hops: Math.min(maxHops, 3), // Cap at 3 hops
            min_confidence: 0.5,
            max_results: 100
          }
        })

    const extractionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      hasSufficientData: true,
      pco,
      stats: {
        extraction_time_ms: extractionTime,
        entity_count: pco.entity_count,
        relationship_count: pco.relationship_count,
        completeness_score: pco.completeness_score
      }
    })

  } catch (err) {
    console.error('PCO extraction error:', err)
    return NextResponse.json(
      {
        error: 'PCO extraction failed',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    )
  }

  try {
    // Check if sufficient data exists
    const hasData = await hasSufficientData(userId, sessionId)

    // Get graph stats
    const stats = await getPatientGraphStats(userId, sessionId)

    return NextResponse.json({
      hasSufficientData: hasData,
      stats,
      recommendations: !hasData ? [
        'Upload medical records to build your patient profile',
        'Complete the Thyself questionnaire for better personalization',
        'Use Cancer Combat to have your diagnosis analyzed'
      ] : []
    })

  } catch (err) {
    console.error('PCO check error:', err)
    return NextResponse.json(
      {
        error: 'Failed to check PCO status',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    )
  }
}

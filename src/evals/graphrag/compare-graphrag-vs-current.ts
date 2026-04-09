/**
 * Compare GraphRAG vs Current Combat
 *
 * Fetches real Combat analyses from DB, reconstructs PCO,
 * runs GraphRAG, and compares what it would add.
 */

import { createClient } from '@supabase/supabase-js'
import { PatientContextObject } from '../../lib/graphrag/types'
import { orchestratePersonaRAG, formatForPrompt } from '../../lib/graphrag/persona-rag'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface CombatAnalysis {
  id: string
  question: string
  records_summary: any
  perspectives: any[]
  synthesis: any
  created_at: string
}

interface ComparisonResult {
  analysis_id: string
  question: string
  cancer_type: string
  biomarkers: string[]

  // Current Combat metrics
  current_personas_with_content: number
  current_has_nccn_citation: boolean
  current_has_biomarker_discussion: boolean
  current_has_trial_mention: boolean

  // GraphRAG metrics
  graphrag_personas_with_chunks: number
  graphrag_total_chunks: number
  graphrag_avg_confidence: number
  graphrag_sources: string[]

  // Comparison
  would_improve: boolean
  improvement_areas: string[]
}

/**
 * Extract PCO from Combat analysis records_summary
 */
function extractPCOFromAnalysis(analysis: CombatAnalysis): PatientContextObject {
  const summary = analysis.records_summary || {}

  // Extract cancer type from various places
  let cancerType = summary.cancerType || summary.cancer_type || ''
  if (!cancerType && analysis.perspectives?.[0]?.argument) {
    // Try to extract from first perspective
    const match = analysis.perspectives[0].argument.match(/(breast|lung|ovarian|prostate|colorectal|pancreatic|melanoma|lymphoma)\s*(cancer)?/i)
    if (match) cancerType = match[0]
  }

  // Extract biomarkers
  const biomarkers: any[] = []
  if (summary.biomarkers) {
    for (const b of summary.biomarkers) {
      biomarkers.push({
        name: b.name || b,
        value: b.value || b.status || 'positive',
        result_type: 'positive' as const,
        source: 'unknown' as const,
        confidence: 0.8
      })
    }
  }

  // Check perspectives for biomarker mentions
  const biomarkerPatterns = ['BRCA1', 'BRCA2', 'HER2', 'EGFR', 'ALK', 'ROS1', 'KRAS', 'BRAF', 'PD-L1', 'MSI-H', 'ER', 'PR']
  const perspectiveText = JSON.stringify(analysis.perspectives || []).toUpperCase()
  for (const bm of biomarkerPatterns) {
    if (perspectiveText.includes(bm) && !biomarkers.find(b => b.name.toUpperCase() === bm)) {
      biomarkers.push({
        name: bm,
        value: 'mentioned in analysis',
        result_type: 'positive' as const,
        source: 'unknown' as const,
        confidence: 0.6
      })
    }
  }

  // Extract treatments
  const treatments: any[] = []
  if (summary.treatments) {
    for (const t of summary.treatments) {
      treatments.push({
        name: t.name || t,
        type: 'other' as const,
        status: t.status || 'unknown',
        confidence: 0.8
      })
    }
  }

  return {
    user_id: undefined,
    session_id: analysis.id,
    extracted_at: new Date().toISOString(),
    diagnoses: cancerType ? [{
      cancer_type: cancerType,
      confidence: 0.8,
      source: 'combat' as const
    }] : [],
    biomarkers,
    treatments,
    symptoms: [],
    lab_results: [],
    related_entities: [],
    communities: [],
    entity_count: biomarkers.length + treatments.length + (cancerType ? 1 : 0),
    relationship_count: 0,
    source_record_count: 1,
    completeness_score: cancerType ? 0.5 : 0.2,
    has_diagnosis: !!cancerType,
    has_biomarkers: biomarkers.length > 0,
    has_treatments: treatments.length > 0
  }
}

/**
 * Analyze current Combat response quality
 */
function analyzeCurrentResponse(analysis: CombatAnalysis): {
  personas_with_content: number
  has_nccn_citation: boolean
  has_biomarker_discussion: boolean
  has_trial_mention: boolean
} {
  const perspectives = analysis.perspectives || []
  const allText = JSON.stringify(perspectives).toLowerCase()

  return {
    personas_with_content: perspectives.filter((p: any) => p.argument?.length > 50).length,
    has_nccn_citation: allText.includes('nccn') || allText.includes('guideline'),
    has_biomarker_discussion: /brca|her2|egfr|alk|pd-l1|msi|biomarker|mutation|genomic/i.test(allText),
    has_trial_mention: /clinical trial|nct|phase [123]|investigational/i.test(allText)
  }
}

/**
 * Determine if GraphRAG would improve the response
 */
function wouldImprove(
  current: ReturnType<typeof analyzeCurrentResponse>,
  graphrag: Awaited<ReturnType<typeof orchestratePersonaRAG>>
): { would_improve: boolean; improvement_areas: string[] } {
  const improvements: string[] = []

  // Check if GraphRAG adds more persona coverage
  if (graphrag.successful_retrievals > current.personas_with_content) {
    improvements.push(`More persona coverage: ${graphrag.successful_retrievals} vs ${current.personas_with_content}`)
  }

  // Check if GraphRAG adds NCCN context when missing
  if (!current.has_nccn_citation && graphrag.results.some(r =>
    r.chunks.some(c => c.source.toLowerCase().includes('nccn') || c.source.toLowerCase().includes('guideline'))
  )) {
    improvements.push('Adds NCCN guideline context')
  }

  // Check if GraphRAG adds biomarker context when missing
  if (!current.has_biomarker_discussion && graphrag.results.some(r =>
    r.persona === 'Molecular Oncologist' && r.chunks.length > 0
  )) {
    improvements.push('Adds biomarker/molecular context')
  }

  // Check if GraphRAG adds trial info when missing
  if (!current.has_trial_mention && graphrag.results.some(r =>
    r.persona === 'Emerging Treatments' && r.chunks.length > 0
  )) {
    improvements.push('Adds clinical trial information')
  }

  // Check if GraphRAG adds QoL/survivorship when not present
  if (graphrag.results.some(r =>
    r.persona === 'Whole Person' && r.chunks.length > 0
  )) {
    const wholePersonContent = graphrag.results.find(r => r.persona === 'Whole Person')
    if (wholePersonContent && wholePersonContent.confidence > 0.5) {
      improvements.push('Adds quality of life / supportive care context')
    }
  }

  return {
    would_improve: improvements.length > 0,
    improvement_areas: improvements
  }
}

async function runComparison() {
  console.log('🔬 GraphRAG vs Current Combat Comparison\n')
  console.log('=' .repeat(60))

  // Fetch recent Combat analyses
  const { data: analyses, error } = await supabase
    .from('combat_analyses')
    .select('id, question, records_summary, perspectives, synthesis, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !analyses) {
    console.error('Failed to fetch analyses:', error)
    return
  }

  console.log(`\nFetched ${analyses.length} Combat analyses to compare\n`)

  const results: ComparisonResult[] = []
  let improved = 0
  let same = 0

  for (const analysis of analyses) {
    process.stdout.write('.')

    // Extract PCO from analysis
    const pco = extractPCOFromAnalysis(analysis)

    // Skip if no cancer type detected
    if (!pco.has_diagnosis) {
      continue
    }

    // Analyze current response
    const currentMetrics = analyzeCurrentResponse(analysis)

    // Run GraphRAG
    const graphragResult = await orchestratePersonaRAG(pco, analysis.question || 'What are my treatment options?')

    // Compare
    const comparison = wouldImprove(currentMetrics, graphragResult)

    const result: ComparisonResult = {
      analysis_id: analysis.id.slice(0, 8),
      question: (analysis.question || '').slice(0, 50),
      cancer_type: pco.diagnoses[0]?.cancer_type || 'unknown',
      biomarkers: pco.biomarkers.map(b => b.name),

      current_personas_with_content: currentMetrics.personas_with_content,
      current_has_nccn_citation: currentMetrics.has_nccn_citation,
      current_has_biomarker_discussion: currentMetrics.has_biomarker_discussion,
      current_has_trial_mention: currentMetrics.has_trial_mention,

      graphrag_personas_with_chunks: graphragResult.successful_retrievals,
      graphrag_total_chunks: graphragResult.total_chunks,
      graphrag_avg_confidence: graphragResult.combined_confidence,
      graphrag_sources: [...new Set(graphragResult.results.flatMap(r => r.sources_used))],

      would_improve: comparison.would_improve,
      improvement_areas: comparison.improvement_areas
    }

    results.push(result)

    if (comparison.would_improve) {
      improved++
    } else {
      same++
    }
  }

  console.log('\n\n')

  // Summary
  console.log('=' .repeat(60))
  console.log('📊 COMPARISON SUMMARY\n')

  console.log(`Total analyses compared: ${results.length}`)
  console.log(`GraphRAG would improve: ${improved} (${(improved/results.length*100).toFixed(0)}%)`)
  console.log(`Current is sufficient: ${same} (${(same/results.length*100).toFixed(0)}%)`)

  // Breakdown by improvement area
  const improvementCounts: Record<string, number> = {}
  for (const r of results) {
    for (const area of r.improvement_areas) {
      const key = area.split(':')[0]
      improvementCounts[key] = (improvementCounts[key] || 0) + 1
    }
  }

  console.log('\n📈 Improvement Areas:')
  for (const [area, count] of Object.entries(improvementCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${area}: ${count} cases`)
  }

  // Cancer type breakdown
  const byCancerType: Record<string, { total: number; improved: number }> = {}
  for (const r of results) {
    const ct = r.cancer_type.toLowerCase()
    if (!byCancerType[ct]) byCancerType[ct] = { total: 0, improved: 0 }
    byCancerType[ct].total++
    if (r.would_improve) byCancerType[ct].improved++
  }

  console.log('\n📋 By Cancer Type:')
  for (const [ct, stats] of Object.entries(byCancerType).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${ct}: ${stats.improved}/${stats.total} would improve`)
  }

  // GraphRAG performance
  const avgConfidence = results.reduce((sum, r) => sum + r.graphrag_avg_confidence, 0) / results.length
  const avgChunks = results.reduce((sum, r) => sum + r.graphrag_total_chunks, 0) / results.length

  console.log('\n🔧 GraphRAG Performance:')
  console.log(`  Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`)
  console.log(`  Avg chunks retrieved: ${avgChunks.toFixed(1)}`)

  // Sample improvements
  console.log('\n📝 Sample Improvements:')
  const sampleImprovements = results.filter(r => r.would_improve).slice(0, 5)
  for (const r of sampleImprovements) {
    console.log(`\n  [${r.cancer_type}] ${r.question}...`)
    console.log(`    Biomarkers: ${r.biomarkers.join(', ') || 'none'}`)
    console.log(`    Current: ${r.current_personas_with_content} personas, NCCN:${r.current_has_nccn_citation}, BM:${r.current_has_biomarker_discussion}`)
    console.log(`    GraphRAG: ${r.graphrag_personas_with_chunks} personas, ${r.graphrag_total_chunks} chunks`)
    console.log(`    Would add: ${r.improvement_areas.join('; ')}`)
  }

  // Verdict
  console.log('\n' + '=' .repeat(60))
  if (improved >= results.length * 0.3) {
    console.log('✅ VERDICT: GraphRAG provides meaningful improvements')
    console.log('   Recommend proceeding with integration')
  } else if (improved >= results.length * 0.1) {
    console.log('⚠️  VERDICT: GraphRAG provides some improvements')
    console.log('   Consider targeted integration for specific cases')
  } else {
    console.log('➡️  VERDICT: Current system is performing well')
    console.log('   GraphRAG adds marginal value')
  }

  return results
}

runComparison().catch(console.error)

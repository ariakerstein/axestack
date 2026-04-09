/**
 * GraphRAG Comparison Evaluation
 *
 * Compares current Combat system context vs GraphRAG PCO context
 * to evaluate improvement potential before cutover.
 *
 * Run: npx tsx src/evals/graphrag/run-comparison-eval.ts
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

console.log('Using', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role key' : 'anon key (read-only)')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Sample size per cancer type
const SAMPLES_PER_CANCER = 3

// ============================================================================
// Types
// ============================================================================

interface CombatAnalysis {
  id: string
  session_id: string
  user_id: string | null
  phase: 'diagnosis' | 'treatment'
  question: string
  perspectives: Array<{
    name: string
    argument: string
    evidence: string[]
    confidence: number
    recommendation: string
  }>
  synthesis: string
  records_summary: {
    count: number
    cancer_type: string | null
    document_types: string[]
  }
  created_at: string
}

interface PatientEntity {
  id: string
  entity_type: string
  entity_value: string
  entity_status: string | null
  entity_date: string | null
  numeric_value: number | null
  numeric_unit: string | null
  confidence: number
  source_text: string | null
}

interface EntityRelationship {
  entity_a_id: string
  entity_b_id: string
  relationship_type: string
  confidence: number
}

interface EvalResult {
  analysis_id: string
  cancer_type: string
  question: string
  phase: string
  created_at: string

  // Current system metrics
  current_context: {
    entity_count: number
    entity_types: Record<string, number>
    has_diagnosis: boolean
    has_biomarkers: boolean
    has_treatments: boolean
    context_snippet: string
  }

  // GraphRAG metrics
  graphrag_context: {
    entity_count: number
    relationship_count: number
    entity_types: Record<string, number>
    has_diagnosis: boolean
    has_biomarkers: boolean
    has_treatments: boolean
    related_entities_via_graph: number
    completeness_score: number
    pco_snippet: string
  }

  // Scores
  scores: {
    context_improvement: number      // % more entities in GraphRAG
    relationship_richness: number    // Relationships per entity
    diagnostic_coverage: number      // 0-100, how well diagnosis captured
    biomarker_coverage: number       // 0-100, how well biomarkers captured
    treatment_coverage: number       // 0-100, how well treatments captured
    overall_improvement: number      // Composite score
  }

  // Qualitative assessment
  assessment: {
    would_benefit_from_graphrag: boolean
    reason: string
    specific_gaps: string[]
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getRecentCombatAnalyses(): Promise<CombatAnalysis[]> {
  console.log('📊 Fetching Combat analyses...')

  const { data, error } = await supabase
    .from('combat_analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching analyses:', error)
    return []
  }

  return data || []
}

async function getEntitiesForSession(userId: string | null, sessionId: string): Promise<PatientEntity[]> {
  let query = supabase
    .from('patient_entities')
    .select('*')
    .order('confidence', { ascending: false })

  if (userId) {
    query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
  } else {
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    console.error('Error fetching entities:', error)
    return []
  }

  return data || []
}

async function getRelationshipsForEntities(entityIds: string[]): Promise<EntityRelationship[]> {
  if (entityIds.length === 0) return []

  const { data, error } = await supabase
    .from('entity_relationships')
    .select('*')
    .or(`entity_a_id.in.(${entityIds.join(',')}),entity_b_id.in.(${entityIds.join(',')})`)

  if (error) {
    console.error('Error fetching relationships:', error)
    return []
  }

  return data || []
}

// ============================================================================
// Analysis Functions
// ============================================================================

function groupEntitiesByType(entities: PatientEntity[]): Record<string, number> {
  const grouped: Record<string, number> = {}
  for (const e of entities) {
    grouped[e.entity_type] = (grouped[e.entity_type] || 0) + 1
  }
  return grouped
}

function buildCurrentContextSnippet(entities: PatientEntity[]): string {
  // Simulates what the current Combat system would see
  const grouped: Record<string, string[]> = {}
  for (const e of entities) {
    if (!grouped[e.entity_type]) grouped[e.entity_type] = []
    let value = e.entity_value
    if (e.entity_status) value += ` (${e.entity_status})`
    grouped[e.entity_type].push(value)
  }

  const lines = Object.entries(grouped).map(([type, values]) => {
    const unique = [...new Set(values)].slice(0, 5)
    return `${type.toUpperCase()}: ${unique.join(', ')}`
  })

  return lines.join('\n')
}

function buildPCOSnippet(entities: PatientEntity[], relationships: EntityRelationship[]): string {
  // What GraphRAG PCO would provide
  const diagnoses = entities.filter(e => ['diagnosis', 'cancer_type'].includes(e.entity_type))
  const biomarkers = entities.filter(e => e.entity_type === 'biomarker')
  const treatments = entities.filter(e => ['treatment', 'medication'].includes(e.entity_type))

  const lines: string[] = []

  if (diagnoses.length > 0) {
    lines.push(`DIAGNOSES (${diagnoses.length}):`)
    diagnoses.slice(0, 3).forEach(d => {
      lines.push(`  - ${d.entity_value}${d.entity_status ? ` [${d.entity_status}]` : ''} (conf: ${d.confidence})`)
    })
  }

  if (biomarkers.length > 0) {
    lines.push(`BIOMARKERS (${biomarkers.length}):`)
    biomarkers.slice(0, 5).forEach(b => {
      lines.push(`  - ${b.entity_value}${b.entity_status ? ` [${b.entity_status}]` : ''}`)
    })
  }

  if (treatments.length > 0) {
    lines.push(`TREATMENTS (${treatments.length}):`)
    treatments.slice(0, 5).forEach(t => {
      lines.push(`  - ${t.entity_value}${t.entity_status ? ` [${t.entity_status}]` : ''}`)
    })
  }

  if (relationships.length > 0) {
    lines.push(`RELATIONSHIPS (${relationships.length}):`)
    const relTypes: Record<string, number> = {}
    relationships.forEach(r => {
      relTypes[r.relationship_type] = (relTypes[r.relationship_type] || 0) + 1
    })
    Object.entries(relTypes).forEach(([type, count]) => {
      lines.push(`  - ${type}: ${count}`)
    })
  }

  return lines.join('\n')
}

function calculateScores(
  entities: PatientEntity[],
  relationships: EntityRelationship[],
  analysis: CombatAnalysis
): EvalResult['scores'] {
  const entityTypes = groupEntitiesByType(entities)

  const hasDiagnosis = (entityTypes['diagnosis'] || 0) > 0 || (entityTypes['cancer_type'] || 0) > 0
  const hasBiomarkers = (entityTypes['biomarker'] || 0) > 0
  const hasTreatments = (entityTypes['treatment'] || 0) > 0 || (entityTypes['medication'] || 0) > 0

  // Calculate coverage scores (0-100)
  const diagnosticCoverage = hasDiagnosis
    ? Math.min(100, ((entityTypes['diagnosis'] || 0) + (entityTypes['cancer_type'] || 0) + (entityTypes['stage'] || 0)) * 20)
    : 0

  const biomarkerCoverage = hasBiomarkers
    ? Math.min(100, (entityTypes['biomarker'] || 0) * 15)
    : 0

  const treatmentCoverage = hasTreatments
    ? Math.min(100, ((entityTypes['treatment'] || 0) + (entityTypes['medication'] || 0)) * 10)
    : 0

  // Relationship richness (relationships per entity)
  const relationshipRichness = entities.length > 0
    ? Math.round((relationships.length / entities.length) * 100) / 100
    : 0

  // Context improvement (how much richer is graph context vs flat list)
  const contextImprovement = relationships.length > 0
    ? Math.min(100, relationships.length * 5 + entities.length * 2)
    : entities.length * 2

  // Overall improvement score
  const overallImprovement = Math.round(
    (diagnosticCoverage * 0.3) +
    (biomarkerCoverage * 0.3) +
    (treatmentCoverage * 0.2) +
    (contextImprovement * 0.2)
  )

  return {
    context_improvement: contextImprovement,
    relationship_richness: relationshipRichness,
    diagnostic_coverage: diagnosticCoverage,
    biomarker_coverage: biomarkerCoverage,
    treatment_coverage: treatmentCoverage,
    overall_improvement: overallImprovement
  }
}

function assessImprovement(
  entities: PatientEntity[],
  relationships: EntityRelationship[],
  scores: EvalResult['scores']
): EvalResult['assessment'] {
  const gaps: string[] = []

  if (scores.diagnostic_coverage < 50) {
    gaps.push('Low diagnostic coverage - need more diagnosis extraction')
  }
  if (scores.biomarker_coverage < 30) {
    gaps.push('Missing biomarker data - critical for precision medicine')
  }
  if (scores.treatment_coverage < 30) {
    gaps.push('Incomplete treatment history')
  }
  if (relationships.length === 0) {
    gaps.push('No entity relationships - missing graph connections')
  }

  const wouldBenefit = relationships.length > 0 || scores.overall_improvement > 50

  let reason = ''
  if (wouldBenefit) {
    if (relationships.length > 0) {
      reason = `GraphRAG would leverage ${relationships.length} entity relationships for richer context`
    } else if (entities.length > 10) {
      reason = `Rich entity data (${entities.length} entities) would benefit from graph traversal`
    } else {
      reason = 'Moderate data that could be enhanced with community detection'
    }
  } else {
    reason = 'Limited patient data - GraphRAG benefit minimal until more records uploaded'
  }

  return {
    would_benefit_from_graphrag: wouldBenefit,
    reason,
    specific_gaps: gaps
  }
}

// ============================================================================
// Main Evaluation
// ============================================================================

async function evaluateAnalysis(analysis: CombatAnalysis): Promise<EvalResult> {
  // Fetch entities for this session
  const entities = await getEntitiesForSession(analysis.user_id, analysis.session_id)

  // Fetch relationships
  const entityIds = entities.map(e => e.id)
  const relationships = await getRelationshipsForEntities(entityIds)

  // Group entities
  const entityTypes = groupEntitiesByType(entities)

  // Calculate scores
  const scores = calculateScores(entities, relationships, analysis)

  // Build assessment
  const assessment = assessImprovement(entities, relationships, scores)

  return {
    analysis_id: analysis.id,
    cancer_type: analysis.records_summary?.cancer_type || 'Unknown',
    question: analysis.question,
    phase: analysis.phase,
    created_at: analysis.created_at,

    current_context: {
      entity_count: entities.length,
      entity_types: entityTypes,
      has_diagnosis: (entityTypes['diagnosis'] || 0) > 0 || (entityTypes['cancer_type'] || 0) > 0,
      has_biomarkers: (entityTypes['biomarker'] || 0) > 0,
      has_treatments: (entityTypes['treatment'] || 0) > 0,
      context_snippet: buildCurrentContextSnippet(entities)
    },

    graphrag_context: {
      entity_count: entities.length,
      relationship_count: relationships.length,
      entity_types: entityTypes,
      has_diagnosis: (entityTypes['diagnosis'] || 0) > 0 || (entityTypes['cancer_type'] || 0) > 0,
      has_biomarkers: (entityTypes['biomarker'] || 0) > 0,
      has_treatments: (entityTypes['treatment'] || 0) > 0,
      related_entities_via_graph: relationships.length,
      completeness_score: scores.overall_improvement / 100,
      pco_snippet: buildPCOSnippet(entities, relationships)
    },

    scores,
    assessment
  }
}

async function runEvaluation() {
  console.log('🚀 Starting GraphRAG Comparison Evaluation\n')
  console.log('=' .repeat(80))

  // Fetch all analyses
  const allAnalyses = await getRecentCombatAnalyses()
  console.log(`Found ${allAnalyses.length} Combat analyses\n`)

  if (allAnalyses.length === 0) {
    console.log('❌ No Combat analyses found in database')
    return
  }

  // Group by cancer type
  const byCancer: Record<string, CombatAnalysis[]> = {}
  for (const analysis of allAnalyses) {
    const cancerType = analysis.records_summary?.cancer_type || 'Unknown'
    if (!byCancer[cancerType]) byCancer[cancerType] = []
    byCancer[cancerType].push(analysis)
  }

  console.log('📊 Distribution by Cancer Type:')
  Object.entries(byCancer)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, analyses]) => {
      console.log(`  ${type}: ${analyses.length} analyses`)
    })
  console.log('')

  // Sample from each cancer type
  const sampled: CombatAnalysis[] = []
  for (const [cancerType, analyses] of Object.entries(byCancer)) {
    const toSample = analyses.slice(0, SAMPLES_PER_CANCER)
    sampled.push(...toSample)
    console.log(`Sampling ${toSample.length} from "${cancerType}"`)
  }

  console.log(`\n📋 Total samples to evaluate: ${sampled.length}\n`)
  console.log('=' .repeat(80))

  // Run evaluation on each
  const results: EvalResult[] = []
  for (let i = 0; i < sampled.length; i++) {
    const analysis = sampled[i]
    console.log(`\n[${i + 1}/${sampled.length}] Evaluating: ${analysis.records_summary?.cancer_type || 'Unknown'}`)
    console.log(`  Question: ${analysis.question.slice(0, 60)}...`)

    try {
      const result = await evaluateAnalysis(analysis)
      results.push(result)
      console.log(`  ✓ Score: ${result.scores.overall_improvement}/100`)
    } catch (err) {
      console.error(`  ✗ Error:`, err)
    }
  }

  // ============================================================================
  // Generate Report
  // ============================================================================

  console.log('\n')
  console.log('=' .repeat(80))
  console.log('📊 GRAPHRAG COMPARISON EVALUATION REPORT')
  console.log('=' .repeat(80))
  console.log('')

  // Summary stats
  const avgScore = results.reduce((sum, r) => sum + r.scores.overall_improvement, 0) / results.length
  const wouldBenefit = results.filter(r => r.assessment.would_benefit_from_graphrag).length
  const avgRelationships = results.reduce((sum, r) => sum + r.graphrag_context.relationship_count, 0) / results.length
  const avgEntities = results.reduce((sum, r) => sum + r.graphrag_context.entity_count, 0) / results.length

  console.log('📈 SUMMARY STATISTICS')
  console.log('-'.repeat(40))
  console.log(`  Total Analyses Evaluated: ${results.length}`)
  console.log(`  Average Overall Score: ${Math.round(avgScore)}/100`)
  console.log(`  Would Benefit from GraphRAG: ${wouldBenefit}/${results.length} (${Math.round(wouldBenefit/results.length*100)}%)`)
  console.log(`  Avg Entities per Patient: ${Math.round(avgEntities)}`)
  console.log(`  Avg Relationships per Patient: ${Math.round(avgRelationships * 10) / 10}`)
  console.log('')

  // By cancer type
  console.log('📊 SCORES BY CANCER TYPE')
  console.log('-'.repeat(40))
  const byCancerResults: Record<string, EvalResult[]> = {}
  for (const r of results) {
    if (!byCancerResults[r.cancer_type]) byCancerResults[r.cancer_type] = []
    byCancerResults[r.cancer_type].push(r)
  }

  const cancerScores = Object.entries(byCancerResults).map(([cancer, rs]) => ({
    cancer,
    count: rs.length,
    avgScore: Math.round(rs.reduce((s, r) => s + r.scores.overall_improvement, 0) / rs.length),
    avgDiag: Math.round(rs.reduce((s, r) => s + r.scores.diagnostic_coverage, 0) / rs.length),
    avgBio: Math.round(rs.reduce((s, r) => s + r.scores.biomarker_coverage, 0) / rs.length),
    avgTx: Math.round(rs.reduce((s, r) => s + r.scores.treatment_coverage, 0) / rs.length),
    benefitRate: Math.round(rs.filter(r => r.assessment.would_benefit_from_graphrag).length / rs.length * 100)
  })).sort((a, b) => b.avgScore - a.avgScore)

  console.log('| Cancer Type                  | N | Score | Diag | Bio | Tx | Benefit% |')
  console.log('|------------------------------|---|-------|------|-----|-----|----------|')
  for (const cs of cancerScores) {
    const cancer = cs.cancer.padEnd(28).slice(0, 28)
    console.log(`| ${cancer} | ${cs.count} | ${String(cs.avgScore).padStart(5)} | ${String(cs.avgDiag).padStart(4)} | ${String(cs.avgBio).padStart(3)} | ${String(cs.avgTx).padStart(3)} | ${String(cs.benefitRate).padStart(8)}% |`)
  }
  console.log('')

  // Coverage analysis
  console.log('📋 COVERAGE ANALYSIS')
  console.log('-'.repeat(40))
  const avgDiag = Math.round(results.reduce((s, r) => s + r.scores.diagnostic_coverage, 0) / results.length)
  const avgBio = Math.round(results.reduce((s, r) => s + r.scores.biomarker_coverage, 0) / results.length)
  const avgTx = Math.round(results.reduce((s, r) => s + r.scores.treatment_coverage, 0) / results.length)

  console.log(`  Diagnostic Coverage: ${avgDiag}% ${avgDiag < 50 ? '⚠️ LOW' : '✓'}`)
  console.log(`  Biomarker Coverage:  ${avgBio}% ${avgBio < 30 ? '⚠️ LOW' : '✓'}`)
  console.log(`  Treatment Coverage:  ${avgTx}% ${avgTx < 30 ? '⚠️ LOW' : '✓'}`)
  console.log('')

  // Gaps identified
  console.log('🔍 COMMON GAPS IDENTIFIED')
  console.log('-'.repeat(40))
  const allGaps: Record<string, number> = {}
  for (const r of results) {
    for (const gap of r.assessment.specific_gaps) {
      allGaps[gap] = (allGaps[gap] || 0) + 1
    }
  }
  Object.entries(allGaps)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([gap, count]) => {
      console.log(`  ${count}x - ${gap}`)
    })
  console.log('')

  // Sample detailed results
  console.log('📝 SAMPLE DETAILED RESULTS (Top 3 Scores)')
  console.log('-'.repeat(40))
  const topResults = [...results].sort((a, b) => b.scores.overall_improvement - a.scores.overall_improvement).slice(0, 3)

  for (const r of topResults) {
    console.log(`\n  Cancer: ${r.cancer_type}`)
    console.log(`  Question: ${r.question.slice(0, 50)}...`)
    console.log(`  Overall Score: ${r.scores.overall_improvement}/100`)
    console.log(`  Entities: ${r.graphrag_context.entity_count} | Relationships: ${r.graphrag_context.relationship_count}`)
    console.log(`  PCO Preview:`)
    r.graphrag_context.pco_snippet.split('\n').slice(0, 6).forEach(line => {
      console.log(`    ${line}`)
    })
    console.log(`  Assessment: ${r.assessment.reason}`)
  }

  console.log('\n')
  console.log('📝 SAMPLE DETAILED RESULTS (Bottom 3 Scores)')
  console.log('-'.repeat(40))
  const bottomResults = [...results].sort((a, b) => a.scores.overall_improvement - b.scores.overall_improvement).slice(0, 3)

  for (const r of bottomResults) {
    console.log(`\n  Cancer: ${r.cancer_type}`)
    console.log(`  Question: ${r.question.slice(0, 50)}...`)
    console.log(`  Overall Score: ${r.scores.overall_improvement}/100`)
    console.log(`  Entities: ${r.graphrag_context.entity_count} | Relationships: ${r.graphrag_context.relationship_count}`)
    console.log(`  Gaps: ${r.assessment.specific_gaps.join('; ') || 'None identified'}`)
    console.log(`  Assessment: ${r.assessment.reason}`)
  }

  // Recommendations
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('💡 RECOMMENDATIONS')
  console.log('=' .repeat(80))
  console.log('')

  if (avgScore >= 60) {
    console.log('✅ READY FOR GRAPHRAG CUTOVER')
    console.log('   - Good baseline data quality')
    console.log('   - GraphRAG will enhance context with relationships')
    console.log('   - Recommend: Proceed with Phase 2 (Persona RAGs)')
  } else if (avgScore >= 40) {
    console.log('⚠️ MODERATE READINESS')
    console.log('   - Data quality is acceptable but could improve')
    console.log('   - Focus on: Entity extraction quality before cutover')
    console.log('   - Recommend: Improve extraction, then proceed')
  } else {
    console.log('❌ NOT YET READY')
    console.log('   - Insufficient patient data for meaningful GraphRAG benefit')
    console.log('   - Focus on: Getting more users to upload records')
    console.log('   - Recommend: Continue building user base first')
  }

  if (avgBio < 30) {
    console.log('')
    console.log('🧬 BIOMARKER GAP:')
    console.log('   - Biomarker extraction is weak')
    console.log('   - This limits Molecular Oncologist persona effectiveness')
    console.log('   - Action: Improve biomarker extraction in entity extraction')
  }

  if (avgRelationships < 0.5) {
    console.log('')
    console.log('🔗 RELATIONSHIP GAP:')
    console.log('   - Few entity relationships exist')
    console.log('   - GraphRAG traversal benefit will be limited')
    console.log('   - Action: Improve relationship extraction between entities')
  }

  console.log('\n' + '=' .repeat(80))
  console.log('Evaluation complete.')
}

// Run
runEvaluation().catch(console.error)

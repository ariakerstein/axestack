/**
 * Combat Response Quality Evaluation
 *
 * Analyzes existing Combat responses to identify:
 * 1. Current quality levels
 * 2. Gaps that GraphRAG would address
 * 3. Areas for improvement
 *
 * Run: npx tsx src/evals/graphrag/eval-combat-quality.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================================
// Types
// ============================================================================

interface Perspective {
  name: string
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
}

interface CombatAnalysis {
  id: string
  phase: 'diagnosis' | 'treatment'
  question: string
  perspectives: Perspective[]
  synthesis: string
  consensus: string[]
  divergence: string[]
  records_summary: {
    count: number
    cancer_type: string | null
    document_types: string[]
  }
  created_at: string
}

interface QualityScore {
  // Content Quality
  has_biomarker_discussion: boolean
  has_treatment_specifics: boolean
  has_staging_info: boolean
  has_clinical_trial_mention: boolean
  has_nccn_citation: boolean
  has_ask_your_doctor: boolean

  // Persona Coverage
  personas_present: string[]
  personas_missing: string[]
  avg_confidence: number

  // Response Quality
  synthesis_quality: 'poor' | 'fair' | 'good' | 'excellent'
  evidence_depth: number  // 0-10
  personalization_level: number  // 0-10

  // GraphRAG Gaps
  would_benefit_from_graph: boolean
  graphrag_improvement_areas: string[]
}

// ============================================================================
// Analysis Functions
// ============================================================================

const EXPECTED_PERSONAS = [
  'Standard of Care',
  'Emerging Evidence',
  'Molecular/Targeted',
  'Watch & Wait',
  'Whole Person'
]

const BIOMARKER_KEYWORDS = [
  'brca', 'her2', 'er', 'pr', 'pd-l1', 'msi', 'egfr', 'alk', 'ros1', 'kras',
  'braf', 'pik3ca', 'ntrk', 'ret', 'met', 'biomarker', 'mutation', 'genomic'
]

const CLINICAL_TRIAL_KEYWORDS = [
  'clinical trial', 'nct', 'phase i', 'phase ii', 'phase iii', 'investigational',
  'experimental', 'trial enrollment', 'clinical study'
]

const NCCN_KEYWORDS = [
  'nccn', 'guideline', 'standard of care', 'first-line', 'second-line',
  'category 1', 'category 2', 'preferred regimen'
]

function analyzeResponse(analysis: CombatAnalysis): QualityScore {
  const allText = [
    analysis.synthesis || '',
    ...(analysis.perspectives || []).flatMap(p => [p.argument, p.recommendation, ...(p.evidence || [])])
  ].join(' ').toLowerCase()

  // Check for biomarker discussion
  const hasBiomarkerDiscussion = BIOMARKER_KEYWORDS.some(k => allText.includes(k))

  // Check for treatment specifics (drug names, regimens)
  const hasTreatmentSpecifics = /\b(chemotherapy|radiation|surgery|immunotherapy|targeted|tamoxifen|herceptin|keytruda|opdivo|carboplatin|paclitaxel|osimertinib|enzalutamide|abiraterone)\b/i.test(allText)

  // Check for staging info
  const hasStagingInfo = /\b(stage\s*[i-iv]+|t[1-4]|n[0-3]|m[0-1]|gleason|grade)\b/i.test(allText)

  // Check for clinical trial mention
  const hasClinicalTrialMention = CLINICAL_TRIAL_KEYWORDS.some(k => allText.includes(k))

  // Check for NCCN citation
  const hasNccnCitation = NCCN_KEYWORDS.some(k => allText.includes(k))

  // Check for "ask your doctor" prompts
  const hasAskYourDoctor = /\b(ask your|discuss with|consult|oncologist|doctor)\b/i.test(allText)

  // Analyze personas
  const presentPersonas = (analysis.perspectives || []).map(p => p.name)
  const missingPersonas = EXPECTED_PERSONAS.filter(ep =>
    !presentPersonas.some(pp => pp.toLowerCase().includes(ep.toLowerCase().split(' ')[0]))
  )

  // Calculate average confidence
  const confidences = (analysis.perspectives || []).map(p => p.confidence || 0)
  const avgConfidence = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0

  // Assess synthesis quality
  let synthesisQuality: QualityScore['synthesis_quality'] = 'poor'
  if (analysis.synthesis) {
    const synthLen = analysis.synthesis.length
    if (synthLen > 500 && (analysis.consensus?.length || 0) > 0) {
      synthesisQuality = 'excellent'
    } else if (synthLen > 300) {
      synthesisQuality = 'good'
    } else if (synthLen > 100) {
      synthesisQuality = 'fair'
    }
  }

  // Calculate evidence depth
  const totalEvidence = (analysis.perspectives || []).reduce((sum, p) => sum + (p.evidence?.length || 0), 0)
  const evidenceDepth = Math.min(10, Math.round(totalEvidence / 2))

  // Calculate personalization level
  let personalizationLevel = 0
  if (analysis.records_summary?.cancer_type) personalizationLevel += 3
  if (hasBiomarkerDiscussion) personalizationLevel += 3
  if (hasStagingInfo) personalizationLevel += 2
  if (hasTreatmentSpecifics) personalizationLevel += 2
  personalizationLevel = Math.min(10, personalizationLevel)

  // Identify GraphRAG improvement areas
  const graphragImprovements: string[] = []

  if (!hasBiomarkerDiscussion) {
    graphragImprovements.push('Add biomarker-specific guidance via Molecular Oncologist RAG')
  }
  if (!hasClinicalTrialMention) {
    graphragImprovements.push('Match to relevant clinical trials via ClinicalTrials.gov RAG')
  }
  if (missingPersonas.length > 0) {
    graphragImprovements.push(`Missing perspectives: ${missingPersonas.join(', ')}`)
  }
  if (personalizationLevel < 5) {
    graphragImprovements.push('Low personalization - PCO would provide richer patient context')
  }
  if (!analysis.records_summary?.cancer_type) {
    graphragImprovements.push('No cancer type detected - improved entity extraction needed')
  }

  const wouldBenefitFromGraph = graphragImprovements.length > 0

  return {
    has_biomarker_discussion: hasBiomarkerDiscussion,
    has_treatment_specifics: hasTreatmentSpecifics,
    has_staging_info: hasStagingInfo,
    has_clinical_trial_mention: hasClinicalTrialMention,
    has_nccn_citation: hasNccnCitation,
    has_ask_your_doctor: hasAskYourDoctor,
    personas_present: presentPersonas,
    personas_missing: missingPersonas,
    avg_confidence: avgConfidence,
    synthesis_quality: synthesisQuality,
    evidence_depth: evidenceDepth,
    personalization_level: personalizationLevel,
    would_benefit_from_graph: wouldBenefitFromGraph,
    graphrag_improvement_areas: graphragImprovements
  }
}

function calculateOverallScore(qs: QualityScore): number {
  let score = 0

  // Content quality (40 points)
  if (qs.has_biomarker_discussion) score += 8
  if (qs.has_treatment_specifics) score += 8
  if (qs.has_staging_info) score += 6
  if (qs.has_clinical_trial_mention) score += 6
  if (qs.has_nccn_citation) score += 6
  if (qs.has_ask_your_doctor) score += 6

  // Persona coverage (20 points)
  score += Math.min(20, qs.personas_present.length * 4)

  // Response quality (40 points)
  const synthPoints = { poor: 0, fair: 5, good: 10, excellent: 15 }
  score += synthPoints[qs.synthesis_quality]
  score += qs.evidence_depth * 1.5  // up to 15
  score += qs.personalization_level  // up to 10

  return Math.round(score)
}

// ============================================================================
// Main Evaluation
// ============================================================================

async function runEvaluation() {
  console.log('🚀 Combat Response Quality Evaluation\n')
  console.log('=' .repeat(80))

  // Fetch analyses
  const { data: analyses, error } = await supabase
    .from('combat_analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching analyses:', error)
    return
  }

  console.log(`📊 Analyzing ${analyses?.length} Combat responses...\n`)

  // Analyze each
  const results: Array<{
    analysis: CombatAnalysis
    score: QualityScore
    overall: number
  }> = []

  for (const analysis of analyses || []) {
    const score = analyzeResponse(analysis)
    const overall = calculateOverallScore(score)
    results.push({ analysis, score, overall })
  }

  // ============================================================================
  // Generate Report
  // ============================================================================

  console.log('=' .repeat(80))
  console.log('📊 COMBAT RESPONSE QUALITY EVALUATION REPORT')
  console.log('=' .repeat(80))
  console.log('')

  // Summary statistics
  const avgOverall = Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length)
  const withBiomarkers = results.filter(r => r.score.has_biomarker_discussion).length
  const withTrials = results.filter(r => r.score.has_clinical_trial_mention).length
  const withNccn = results.filter(r => r.score.has_nccn_citation).length
  const wouldBenefit = results.filter(r => r.score.would_benefit_from_graph).length

  console.log('📈 SUMMARY STATISTICS')
  console.log('-'.repeat(40))
  console.log(`  Total Responses Analyzed: ${results.length}`)
  console.log(`  Average Quality Score: ${avgOverall}/100`)
  console.log(`  With Biomarker Discussion: ${withBiomarkers}/${results.length} (${Math.round(withBiomarkers/results.length*100)}%)`)
  console.log(`  With Clinical Trial Mention: ${withTrials}/${results.length} (${Math.round(withTrials/results.length*100)}%)`)
  console.log(`  With NCCN Citation: ${withNccn}/${results.length} (${Math.round(withNccn/results.length*100)}%)`)
  console.log(`  Would Benefit from GraphRAG: ${wouldBenefit}/${results.length} (${Math.round(wouldBenefit/results.length*100)}%)`)
  console.log('')

  // Score distribution
  console.log('📊 SCORE DISTRIBUTION')
  console.log('-'.repeat(40))
  const excellent = results.filter(r => r.overall >= 80).length
  const good = results.filter(r => r.overall >= 60 && r.overall < 80).length
  const fair = results.filter(r => r.overall >= 40 && r.overall < 60).length
  const poor = results.filter(r => r.overall < 40).length

  console.log(`  Excellent (80-100): ${excellent} (${Math.round(excellent/results.length*100)}%)`)
  console.log(`  Good (60-79):       ${good} (${Math.round(good/results.length*100)}%)`)
  console.log(`  Fair (40-59):       ${fair} (${Math.round(fair/results.length*100)}%)`)
  console.log(`  Poor (<40):         ${poor} (${Math.round(poor/results.length*100)}%)`)
  console.log('')

  // By cancer type
  console.log('📊 SCORES BY CANCER TYPE')
  console.log('-'.repeat(40))
  const byCancer: Record<string, typeof results> = {}
  for (const r of results) {
    const cancer = r.analysis.records_summary?.cancer_type || 'Unknown'
    if (!byCancer[cancer]) byCancer[cancer] = []
    byCancer[cancer].push(r)
  }

  const cancerStats = Object.entries(byCancer)
    .map(([cancer, rs]) => ({
      cancer: cancer.slice(0, 35),
      count: rs.length,
      avgScore: Math.round(rs.reduce((s, r) => s + r.overall, 0) / rs.length),
      biomarkerRate: Math.round(rs.filter(r => r.score.has_biomarker_discussion).length / rs.length * 100),
      trialRate: Math.round(rs.filter(r => r.score.has_clinical_trial_mention).length / rs.length * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  console.log('| Cancer Type                         | N | Score | Bio% | Trial% |')
  console.log('|-------------------------------------|---|-------|------|--------|')
  for (const cs of cancerStats) {
    console.log(`| ${cs.cancer.padEnd(35)} | ${String(cs.count).padStart(1)} | ${String(cs.avgScore).padStart(5)} | ${String(cs.biomarkerRate).padStart(4)}% | ${String(cs.trialRate).padStart(6)}% |`)
  }
  console.log('')

  // Missing persona analysis
  console.log('📋 PERSONA COVERAGE')
  console.log('-'.repeat(40))
  const personaCounts: Record<string, number> = {}
  for (const r of results) {
    for (const p of r.score.personas_present) {
      personaCounts[p] = (personaCounts[p] || 0) + 1
    }
  }
  Object.entries(personaCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([persona, count]) => {
      const pct = Math.round(count / results.length * 100)
      console.log(`  ${persona}: ${count}/${results.length} (${pct}%)`)
    })
  console.log('')

  // GraphRAG improvement opportunities
  console.log('🔧 GRAPHRAG IMPROVEMENT OPPORTUNITIES')
  console.log('-'.repeat(40))
  const improvementCounts: Record<string, number> = {}
  for (const r of results) {
    for (const imp of r.score.graphrag_improvement_areas) {
      // Normalize the improvement text
      const key = imp.split(':')[0].trim()
      improvementCounts[key] = (improvementCounts[key] || 0) + 1
    }
  }
  Object.entries(improvementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([improvement, count]) => {
      const pct = Math.round(count / results.length * 100)
      console.log(`  ${count}x (${pct}%) - ${improvement}`)
    })
  console.log('')

  // Sample responses
  console.log('📝 SAMPLE HIGH-QUALITY RESPONSES')
  console.log('-'.repeat(40))
  const topResponses = [...results].sort((a, b) => b.overall - a.overall).slice(0, 3)
  for (const r of topResponses) {
    console.log(`\n  Cancer: ${r.analysis.records_summary?.cancer_type || 'Unknown'}`)
    console.log(`  Score: ${r.overall}/100`)
    console.log(`  Biomarkers: ${r.score.has_biomarker_discussion ? '✓' : '✗'} | Trials: ${r.score.has_clinical_trial_mention ? '✓' : '✗'} | NCCN: ${r.score.has_nccn_citation ? '✓' : '✗'}`)
    console.log(`  Personas: ${r.score.personas_present.length}/${EXPECTED_PERSONAS.length}`)
    console.log(`  Synthesis: ${r.score.synthesis_quality}`)
  }

  console.log('\n')
  console.log('📝 SAMPLE LOW-QUALITY RESPONSES (improvement targets)')
  console.log('-'.repeat(40))
  const bottomResponses = [...results].sort((a, b) => a.overall - b.overall).slice(0, 3)
  for (const r of bottomResponses) {
    console.log(`\n  Cancer: ${r.analysis.records_summary?.cancer_type || 'Unknown'}`)
    console.log(`  Score: ${r.overall}/100`)
    console.log(`  Issues: ${r.score.graphrag_improvement_areas.slice(0, 2).join('; ')}`)
    console.log(`  Missing: ${r.score.personas_missing.slice(0, 2).join(', ') || 'None'}`)
  }

  // Final recommendations
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('💡 GRAPHRAG IMPACT ANALYSIS')
  console.log('=' .repeat(80))
  console.log('')

  const lowBiomarkerRate = (100 - Math.round(withBiomarkers/results.length*100))
  const lowTrialRate = (100 - Math.round(withTrials/results.length*100))

  console.log(`📊 PROJECTED IMPROVEMENTS WITH GRAPHRAG:`)
  console.log('')
  console.log(`  1. BIOMARKER PERSONALIZATION`)
  console.log(`     Current: ${Math.round(withBiomarkers/results.length*100)}% of responses discuss biomarkers`)
  console.log(`     With GraphRAG: ~90%+ (PCO extracts biomarkers from records)`)
  console.log(`     Impact: ${lowBiomarkerRate}% of responses would improve`)
  console.log('')
  console.log(`  2. CLINICAL TRIAL MATCHING`)
  console.log(`     Current: ${Math.round(withTrials/results.length*100)}% mention clinical trials`)
  console.log(`     With GraphRAG: ~80%+ (ClinicalTrials.gov RAG integration)`)
  console.log(`     Impact: ${lowTrialRate}% of responses would improve`)
  console.log('')
  console.log(`  3. PERSONA COMPLETENESS`)
  console.log(`     Current: Most responses have ${Math.round(results.reduce((s, r) => s + r.score.personas_present.length, 0) / results.length)} of 5 personas`)
  console.log(`     With GraphRAG: Full 5-persona analysis for every query`)
  console.log('')
  console.log(`  4. "PATIENTS LIKE YOU" (Future)`)
  console.log(`     Current: 0% - no cross-patient context`)
  console.log(`     With GraphRAG Community Detection: Enable cohort-based insights`)
  console.log('')

  if (avgOverall < 50) {
    console.log('⚠️ RECOMMENDATION: Current quality baseline is low.')
    console.log('   GraphRAG would provide significant improvements, but also')
    console.log('   consider improving record upload rates and entity extraction first.')
  } else if (avgOverall < 70) {
    console.log('✓ RECOMMENDATION: Good baseline quality.')
    console.log('   GraphRAG would meaningfully improve biomarker personalization')
    console.log('   and clinical trial matching. Proceed with Phase 2.')
  } else {
    console.log('✅ RECOMMENDATION: Strong baseline quality.')
    console.log('   GraphRAG will enhance already good responses with')
    console.log('   deeper personalization and cross-patient insights.')
  }

  console.log('\n' + '=' .repeat(80))
  console.log('Evaluation complete.')
}

runEvaluation().catch(console.error)

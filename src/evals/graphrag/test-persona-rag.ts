/**
 * Test Persona RAG Retrievers
 *
 * Validates that all 5 persona retrievers work correctly
 * using the PARP test case as the primary benchmark.
 */

import { PatientContextObject } from '../../lib/graphrag/types'
import {
  orchestratePersonaRAG,
  createRetriever,
  selectBestPersona,
  formatForPrompt,
  getPersonaNames
} from '../../lib/graphrag/persona-rag'

// ============================================================================
// Test Cases
// ============================================================================

const PARP_TEST_CASE: { pco: PatientContextObject; query: string; expected: string[] } = {
  pco: {
    user_id: 'test-user-parp',
    session_id: 'test-session-parp',
    extracted_at: new Date().toISOString(),
    diagnoses: [{
      cancer_type: 'ovarian cancer',
      histology: 'high-grade serous',
      stage: 'IIIC',
      confidence: 0.95,
      source: 'records'
    }],
    biomarkers: [{
      name: 'BRCA2',
      value: 'pathogenic mutation',
      result_type: 'positive',
      source: 'germline',
      confidence: 0.95
    }],
    treatments: [{
      name: 'carboplatin/paclitaxel',
      type: 'chemotherapy',
      status: 'completed',
      response: 'complete',
      confidence: 0.9
    }],
    symptoms: [],
    lab_results: [],
    related_entities: [],
    communities: [],
    entity_count: 3,
    relationship_count: 0,
    source_record_count: 1,
    completeness_score: 0.7,
    has_diagnosis: true,
    has_biomarkers: true,
    has_treatments: true
  },
  query: 'Should I be on a PARP inhibitor?',
  expected: [
    'PARP',
    'olaparib',
    'niraparib',
    'BRCA',
    'maintenance',
    'platinum'
  ]
}

const TEST_CASES = [
  {
    name: 'PARP Test - BRCA2+ Ovarian',
    ...PARP_TEST_CASE
  },
  {
    name: 'HER2+ Breast Cancer',
    pco: {
      user_id: 'test-user-her2',
      session_id: 'test-session-her2',
      extracted_at: new Date().toISOString(),
      diagnoses: [{
        cancer_type: 'breast cancer',
        histology: 'invasive ductal carcinoma',
        stage: 'II',
        confidence: 0.9,
        source: 'records'
      }],
      biomarkers: [{
        name: 'HER2',
        value: 'positive (IHC 3+)',
        result_type: 'positive',
        source: 'somatic',
        confidence: 0.95
      }, {
        name: 'ER',
        value: 'positive',
        result_type: 'positive',
        source: 'somatic',
        confidence: 0.95
      }],
      treatments: [],
      symptoms: [],
      lab_results: [],
      related_entities: [],
      communities: [],
      entity_count: 3,
      relationship_count: 0,
      source_record_count: 1,
      completeness_score: 0.6,
      has_diagnosis: true,
      has_biomarkers: true,
      has_treatments: false
    } as PatientContextObject,
    query: 'What targeted therapy options are available for my cancer?',
    expected: ['trastuzumab', 'HER2', 'pertuzumab']
  },
  {
    name: 'Fatigue Management Query',
    pco: {
      user_id: 'test-user-qol',
      session_id: 'test-session-qol',
      extracted_at: new Date().toISOString(),
      diagnoses: [{
        cancer_type: 'colorectal cancer',
        stage: 'III',
        confidence: 0.9,
        source: 'records'
      }],
      biomarkers: [],
      treatments: [{
        name: 'FOLFOX',
        type: 'chemotherapy',
        status: 'current',
        confidence: 0.9
      }],
      symptoms: [{
        name: 'fatigue',
        severity: 'moderate'
      }],
      lab_results: [],
      related_entities: [],
      communities: [],
      entity_count: 2,
      relationship_count: 0,
      source_record_count: 1,
      completeness_score: 0.5,
      has_diagnosis: true,
      has_biomarkers: false,
      has_treatments: true
    } as PatientContextObject,
    query: 'How can I manage my fatigue during chemo?',
    expected: ['fatigue', 'exercise', 'energy', 'sleep']
  },
  {
    name: 'Surveillance Question',
    pco: {
      user_id: 'test-user-surv',
      session_id: 'test-session-surv',
      extracted_at: new Date().toISOString(),
      diagnoses: [{
        cancer_type: 'prostate cancer',
        stage: 'low risk',
        confidence: 0.9,
        source: 'profile'
      }],
      biomarkers: [],
      treatments: [],
      symptoms: [],
      lab_results: [{
        name: 'PSA',
        value: 5.2,
        unit: 'ng/mL',
        status: 'elevated'
      }],
      related_entities: [],
      communities: [],
      entity_count: 2,
      relationship_count: 0,
      source_record_count: 1,
      completeness_score: 0.4,
      has_diagnosis: true,
      has_biomarkers: false,
      has_treatments: false
    } as PatientContextObject,
    query: 'What monitoring is recommended for active surveillance?',
    expected: ['surveillance', 'PSA', 'biopsy', 'monitoring']
  }
]

// ============================================================================
// Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 Persona RAG Test Suite\n')
  console.log('=' .repeat(60))

  let passed = 0
  let failed = 0

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`)
    console.log(`   Query: "${testCase.query}"`)
    console.log(`   Cancer: ${testCase.pco.diagnoses[0]?.cancer_type || 'Unknown'}`)
    console.log(`   Biomarkers: ${testCase.pco.biomarkers.map(b => b.name).join(', ') || 'None'}`)

    try {
      // Run orchestrator
      const result = await orchestratePersonaRAG(testCase.pco, testCase.query)

      console.log(`\n   Results:`)
      console.log(`   - Time: ${result.total_time_ms}ms`)
      console.log(`   - Successful retrievals: ${result.successful_retrievals}/5`)
      console.log(`   - Total chunks: ${result.total_chunks}`)
      console.log(`   - Combined confidence: ${(result.combined_confidence * 100).toFixed(1)}%`)

      // Check each persona
      console.log(`\n   Per-Persona:`)
      for (const personaResult of result.results) {
        const status = personaResult.chunks.length > 0 ? '✓' : '✗'
        console.log(`   ${status} ${personaResult.persona}: ${personaResult.chunks.length} chunks, ${(personaResult.confidence * 100).toFixed(0)}% conf`)
      }

      // Check expected terms
      const allContent = result.results
        .flatMap(r => r.chunks)
        .map(c => c.content.toLowerCase())
        .join(' ')

      const foundTerms = testCase.expected.filter(term =>
        allContent.includes(term.toLowerCase())
      )
      const missingTerms = testCase.expected.filter(term =>
        !allContent.includes(term.toLowerCase())
      )

      console.log(`\n   Expected terms found: ${foundTerms.length}/${testCase.expected.length}`)
      if (missingTerms.length > 0) {
        console.log(`   Missing: ${missingTerms.join(', ')}`)
      }

      // Determine pass/fail
      const passRate = foundTerms.length / testCase.expected.length
      if (passRate >= 0.5 && result.successful_retrievals >= 2) {
        console.log(`   ✅ PASSED`)
        passed++
      } else {
        console.log(`   ❌ FAILED (pass rate: ${(passRate * 100).toFixed(0)}%, need ≥50%)`)
        failed++
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`)
      failed++
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log(`\n📊 SUMMARY: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests`)

  if (passed === TEST_CASES.length) {
    console.log('✅ All tests passed!')
  } else {
    console.log('⚠️  Some tests failed - review retrieval quality')
  }

  return { passed, failed }
}

// ============================================================================
// Individual Retriever Tests
// ============================================================================

async function testIndividualRetrievers() {
  console.log('\n\n🔬 Testing Individual Retrievers\n')
  console.log('=' .repeat(60))

  const pco = PARP_TEST_CASE.pco
  const query = PARP_TEST_CASE.query

  for (const personaName of getPersonaNames()) {
    console.log(`\n📌 ${personaName}`)

    const retriever = createRetriever(personaName)
    const result = await retriever.retrieve({ pco, query })

    console.log(`   Time: ${result.retrieval_time_ms}ms`)
    console.log(`   Chunks: ${result.chunks.length}`)
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`   Sources: ${result.sources_used.join(', ') || 'None'}`)

    if (result.chunks.length > 0) {
      console.log(`   Top chunk preview: "${result.chunks[0].content.slice(0, 100)}..."`)
    }
  }
}

// ============================================================================
// Persona Selection Test
// ============================================================================

function testPersonaSelection() {
  console.log('\n\n🎯 Testing Persona Selection\n')
  console.log('=' .repeat(60))

  const testQueries = [
    { query: 'What BRCA mutation means for my treatment?', expected: 'Molecular Oncologist' },
    { query: 'Are there any clinical trials I should consider?', expected: 'Emerging Treatments' },
    { query: 'How often should I get a CT scan?', expected: 'Watch & Wait' },
    { query: 'How can I cope with nausea from chemo?', expected: 'Whole Person' },
    { query: 'What does NCCN recommend for my stage?', expected: 'SOC Advisor' },
  ]

  const dummyPCO = PARP_TEST_CASE.pco

  for (const { query, expected } of testQueries) {
    const selected = selectBestPersona(query, dummyPCO)
    const match = selected === expected ? '✅' : '❌'
    console.log(`${match} "${query.slice(0, 40)}..." → ${selected} (expected: ${expected})`)
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚀 GraphRAG Persona RAG Validation\n')
  console.log(new Date().toISOString())
  console.log('\n')

  // Test persona selection (sync, fast)
  testPersonaSelection()

  // Test individual retrievers
  await testIndividualRetrievers()

  // Run full test suite
  const results = await runTests()

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0)
}

main().catch(console.error)

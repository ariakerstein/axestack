/**
 * Combat Eval Runner
 *
 * Runs test cases against the Combat API and scores results.
 * Usage: npx ts-node src/evals/combat/run-evals.ts [--persona molecular] [--case mol-001]
 */

import {
  ALL_TEST_CASES,
  TEST_CASES_BY_PERSONA,
  PERSONA_NAMES,
  TestCase
} from './test-cases'

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3000'
const COMBAT_ENDPOINT = `${API_BASE}/api/combat`

// Map persona IDs to Combat API persona keys
const PERSONA_KEY_MAP: Record<string, string> = {
  molecular: 'precision',
  conservative: 'conservative',
  guidelines: 'guidelines',
  aggressive: 'aggressive',
  integrative: 'integrative',
}

interface EvalResult {
  testCase: TestCase
  passed: boolean
  score: number
  maxScore: number
  response: string
  requiredMatches: { pattern: string; found: boolean }[]
  forbiddenMatches: { pattern: string; found: boolean }[]
  errors: string[]
  latencyMs: number
}

interface PersonaScore {
  persona: string
  personaDisplayName: string
  passed: number
  failed: number
  total: number
  passRate: number
  avgLatencyMs: number
  criticalFailures: string[]
  results: EvalResult[]
}

// Build a mock record from test case input
function buildMockRecord(input: TestCase['input']) {
  return {
    fileName: 'eval-test-record.pdf',
    documentType: 'Pathology Report',
    result: {
      document_type: 'Pathology Report',
      diagnosis: [input.cancerType],
      cancer_specific: {
        cancer_type: input.cancerType,
        stage: input.stage || 'Not specified',
        grade: 'Not specified',
        biomarkers: input.biomarkers || [],
        treatment_timeline: input.treatments?.join(', ') || '',
      },
      test_summary: `Patient with ${input.cancerType}. ${input.biomarkers?.join(', ') || 'No biomarkers specified'}.`,
      recommended_next_steps: [],
    },
    documentText: input.documentText || `
      Diagnosis: ${input.cancerType}
      Stage: ${input.stage || 'Not specified'}
      Biomarkers: ${input.biomarkers?.join(', ') || 'None'}
      Age: ${input.age || 'Not specified'}
      Comorbidities: ${input.comorbidities?.join(', ') || 'None'}
      Prior treatments: ${input.treatments?.join(', ') || 'None'}
    `,
  }
}

// Call the Combat API
async function callCombatAPI(testCase: TestCase): Promise<{ response: string; latencyMs: number }> {
  const record = buildMockRecord(testCase.input)

  // Weight the target persona highly (80) to get a detailed response
  const weights: Record<string, number> = {
    guidelines: 50,
    aggressive: 50,
    precision: 50,
    conservative: 50,
    integrative: 50,
  }
  const personaKey = PERSONA_KEY_MAP[testCase.persona]
  weights[personaKey] = 80

  const startTime = Date.now()

  try {
    const response = await fetch(COMBAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 'treatment',
        records: [record],
        weights,
        communicationStyle: 'research', // Get detailed responses for eval
      }),
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Extract the target persona's response
    const perspectives = data.perspectives || []
    const personaDisplayName = PERSONA_NAMES[testCase.persona]
    const targetPerspective = perspectives.find(
      (p: { name: string }) => p.name === personaDisplayName
    )

    if (!targetPerspective) {
      throw new Error(`Persona "${personaDisplayName}" not found in response`)
    }

    // Combine all relevant text from the perspective
    const responseText = [
      targetPerspective.argument || '',
      targetPerspective.recommendation || '',
      ...(targetPerspective.evidence || []),
    ].join(' ')

    return { response: responseText, latencyMs }

  } catch (err) {
    const latencyMs = Date.now() - startTime
    throw { message: err instanceof Error ? err.message : String(err), latencyMs }
  }
}

// Score a response against expected patterns
function scoreResponse(response: string, expected: TestCase['expected']): {
  score: number
  maxScore: number
  requiredMatches: { pattern: string; found: boolean }[]
  forbiddenMatches: { pattern: string; found: boolean }[]
} {
  const responseLower = response.toLowerCase()

  // Check required patterns (must contain ALL)
  const requiredMatches = (expected.required || []).map(pattern => ({
    pattern,
    found: responseLower.includes(pattern.toLowerCase()),
  }))

  // Check forbidden patterns (must NOT contain ANY)
  const forbiddenMatches = (expected.forbidden || []).map(pattern => ({
    pattern,
    found: responseLower.includes(pattern.toLowerCase()),
  }))

  // Calculate score
  const requiredScore = requiredMatches.filter(m => m.found).length
  const requiredMax = requiredMatches.length || 1

  const forbiddenPenalty = forbiddenMatches.filter(m => m.found).length
  const forbiddenMax = forbiddenMatches.length || 0

  // Score: % of required found, minus penalty for forbidden
  const requiredPct = requiredScore / requiredMax
  const forbiddenPct = forbiddenMax > 0 ? forbiddenPenalty / forbiddenMax : 0

  const score = Math.max(0, requiredPct - forbiddenPct)
  const maxScore = 1

  return { score, maxScore, requiredMatches, forbiddenMatches }
}

// Run a single test case
async function runTestCase(testCase: TestCase): Promise<EvalResult> {
  const errors: string[] = []
  let response = ''
  let latencyMs = 0

  try {
    const result = await callCombatAPI(testCase)
    response = result.response
    latencyMs = result.latencyMs
  } catch (err: unknown) {
    const error = err as { message: string; latencyMs?: number }
    errors.push(error.message)
    latencyMs = error.latencyMs || 0
  }

  const scoring = scoreResponse(response, testCase.expected)

  // Pass if score >= 0.7 and no critical forbidden matches
  const hasForbiddenMatch = scoring.forbiddenMatches.some(m => m.found)
  const passed = scoring.score >= 0.7 && !hasForbiddenMatch && errors.length === 0

  return {
    testCase,
    passed,
    score: scoring.score,
    maxScore: scoring.maxScore,
    response: response.slice(0, 500) + (response.length > 500 ? '...' : ''),
    requiredMatches: scoring.requiredMatches,
    forbiddenMatches: scoring.forbiddenMatches,
    errors,
    latencyMs,
  }
}

// Run all test cases for a persona
async function runPersonaEvals(
  persona: keyof typeof TEST_CASES_BY_PERSONA,
  severityFilter?: string | null
): Promise<PersonaScore> {
  let cases = TEST_CASES_BY_PERSONA[persona]

  // Filter by severity if specified
  if (severityFilter) {
    cases = cases.filter(c => c.severity === severityFilter)
  }

  const results: EvalResult[] = []

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running ${PERSONA_NAMES[persona]} (${cases.length} cases${severityFilter ? `, ${severityFilter} only` : ''})`)
  console.log('='.repeat(60))

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.id}: ${testCase.name.slice(0, 40)}... `)

    const result = await runTestCase(testCase)
    results.push(result)

    if (result.passed) {
      console.log(`✅ PASS (${result.latencyMs}ms)`)
    } else {
      console.log(`❌ FAIL (score: ${(result.score * 100).toFixed(0)}%)`)
      if (result.errors.length > 0) {
        console.log(`     Error: ${result.errors[0]}`)
      }
      const failedRequired = result.requiredMatches.filter(m => !m.found)
      if (failedRequired.length > 0) {
        console.log(`     Missing: ${failedRequired.map(m => m.pattern).join(', ')}`)
      }
      const foundForbidden = result.forbiddenMatches.filter(m => m.found)
      if (foundForbidden.length > 0) {
        console.log(`     Forbidden found: ${foundForbidden.map(m => m.pattern).join(', ')}`)
      }
    }

    // Rate limiting - wait between calls
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const criticalFailures = results
    .filter(r => !r.passed && r.testCase.severity === 'critical')
    .map(r => r.testCase.id)

  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length

  return {
    persona,
    personaDisplayName: PERSONA_NAMES[persona],
    passed,
    failed,
    total: cases.length,
    passRate: passed / cases.length,
    avgLatencyMs: avgLatency,
    criticalFailures,
    results,
  }
}

// Generate summary report
function generateReport(scores: PersonaScore[]): string {
  const lines: string[] = []

  lines.push('\n' + '='.repeat(70))
  lines.push('COMBAT EVAL REPORT')
  lines.push('='.repeat(70))
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // Summary table
  lines.push('SUMMARY BY PERSONA')
  lines.push('-'.repeat(70))
  lines.push(
    'Persona'.padEnd(25) +
    'Pass'.padStart(6) +
    'Fail'.padStart(6) +
    'Rate'.padStart(8) +
    'Latency'.padStart(10) +
    'Critical'.padStart(10)
  )
  lines.push('-'.repeat(70))

  let totalPassed = 0
  let totalFailed = 0
  let allCriticalFailures: string[] = []

  for (const score of scores) {
    totalPassed += score.passed
    totalFailed += score.failed
    allCriticalFailures.push(...score.criticalFailures)

    lines.push(
      score.personaDisplayName.padEnd(25) +
      String(score.passed).padStart(6) +
      String(score.failed).padStart(6) +
      `${(score.passRate * 100).toFixed(0)}%`.padStart(8) +
      `${score.avgLatencyMs.toFixed(0)}ms`.padStart(10) +
      String(score.criticalFailures.length).padStart(10)
    )
  }

  lines.push('-'.repeat(70))
  lines.push(
    'TOTAL'.padEnd(25) +
    String(totalPassed).padStart(6) +
    String(totalFailed).padStart(6) +
    `${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(0)}%`.padStart(8) +
    ''.padStart(10) +
    String(allCriticalFailures.length).padStart(10)
  )
  lines.push('')

  // Critical failures detail
  if (allCriticalFailures.length > 0) {
    lines.push('⚠️  CRITICAL FAILURES (require immediate attention)')
    lines.push('-'.repeat(70))
    for (const score of scores) {
      for (const failId of score.criticalFailures) {
        const result = score.results.find(r => r.testCase.id === failId)
        if (result) {
          lines.push(`  ${failId}: ${result.testCase.name}`)
          lines.push(`    Rationale: ${result.testCase.clinicalRationale}`)
        }
      }
    }
    lines.push('')
  }

  // Detailed failures
  lines.push('DETAILED FAILURES')
  lines.push('-'.repeat(70))
  for (const score of scores) {
    const failures = score.results.filter(r => !r.passed)
    if (failures.length > 0) {
      lines.push(`\n${score.personaDisplayName}:`)
      for (const fail of failures) {
        lines.push(`  [${fail.testCase.severity.toUpperCase()}] ${fail.testCase.id}: ${fail.testCase.name}`)
        lines.push(`    Score: ${(fail.score * 100).toFixed(0)}%`)

        const missing = fail.requiredMatches.filter(m => !m.found)
        if (missing.length > 0) {
          lines.push(`    Missing required: ${missing.map(m => `"${m.pattern}"`).join(', ')}`)
        }

        const forbidden = fail.forbiddenMatches.filter(m => m.found)
        if (forbidden.length > 0) {
          lines.push(`    Found forbidden: ${forbidden.map(m => `"${m.pattern}"`).join(', ')}`)
        }

        if (fail.errors.length > 0) {
          lines.push(`    Errors: ${fail.errors.join(', ')}`)
        }
      }
    }
  }

  lines.push('\n' + '='.repeat(70))

  return lines.join('\n')
}

// Main runner
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let targetPersona: string | null = null
  let targetCase: string | null = null
  let severityFilter: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--persona' && args[i + 1]) {
      targetPersona = args[i + 1]
    }
    if (args[i] === '--case' && args[i + 1]) {
      targetCase = args[i + 1]
    }
    if (args[i] === '--severity' && args[i + 1]) {
      severityFilter = args[i + 1]
    }
  }

  console.log('Combat Persona Eval Suite')
  console.log(`API: ${COMBAT_ENDPOINT}`)
  console.log(`Time: ${new Date().toISOString()}`)

  const scores: PersonaScore[] = []

  if (targetCase) {
    // Run single test case
    const testCase = ALL_TEST_CASES.find(tc => tc.id === targetCase)
    if (!testCase) {
      console.error(`Test case not found: ${targetCase}`)
      process.exit(1)
    }
    console.log(`\nRunning single case: ${targetCase}`)
    const result = await runTestCase(testCase)
    console.log('\nResult:', JSON.stringify(result, null, 2))

  } else if (targetPersona) {
    // Run single persona
    if (!(targetPersona in TEST_CASES_BY_PERSONA)) {
      console.error(`Unknown persona: ${targetPersona}`)
      console.error(`Valid: ${Object.keys(TEST_CASES_BY_PERSONA).join(', ')}`)
      process.exit(1)
    }
    const score = await runPersonaEvals(targetPersona as keyof typeof TEST_CASES_BY_PERSONA, severityFilter)
    scores.push(score)

  } else {
    // Run all personas
    for (const persona of Object.keys(TEST_CASES_BY_PERSONA) as Array<keyof typeof TEST_CASES_BY_PERSONA>) {
      const score = await runPersonaEvals(persona, severityFilter)
      scores.push(score)
    }
  }

  if (scores.length > 0) {
    const report = generateReport(scores)
    console.log(report)

    // Save report to file
    const reportPath = `src/evals/combat/reports/eval-${Date.now()}.txt`
    const fs = await import('fs')
    const path = await import('path')
    const dir = path.dirname(reportPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(reportPath, report)
    console.log(`\nReport saved to: ${reportPath}`)
  }
}

// Export for programmatic use
export { runTestCase, runPersonaEvals, generateReport }

// Run if called directly
main().catch(console.error)

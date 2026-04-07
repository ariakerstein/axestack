/**
 * Comprehensive test suite to verify data quality fixes
 * Run this after implementing fixes to validate everything works
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Test configuration
const SAMPLE_SIZE = 10
const TEST_QUERIES = [
  'How do I find clinical trials for lung cancer?',
  'What are NCCN guidelines for breast cancer?',
  'What biomarker tests should I get?',
  'Finding the best clinical trial',
]

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  details: string
  score?: number
}

const results: TestResult[] = []

// ============================================================================
// TEST 1: URL ACCESSIBILITY
// ============================================================================

async function testUrlAccessibility() {
  console.log('\n🔗 TEST 1: URL Accessibility\n')

  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, url, content_type')
    .not('url', 'is', null)
    .neq('url', '')
    .limit(SAMPLE_SIZE)

  if (error) {
    results.push({
      name: 'URL Accessibility',
      status: 'FAIL',
      details: `Error fetching URLs: ${error.message}`,
    })
    return
  }

  let validUrls = 0
  let invalidUrls = 0

  console.log('Checking sample URLs:\n')

  for (const chunk of chunks || []) {
    // Check if URL is properly formatted
    const isValidFormat = chunk.url.startsWith('http://') || chunk.url.startsWith('https://')

    console.log(`${isValidFormat ? '✅' : '❌'} ${chunk.url}`)
    console.log(`   Title: ${chunk.guideline_title}`)
    console.log(`   Type: ${chunk.content_type}\n`)

    if (isValidFormat) {
      validUrls++
    } else {
      invalidUrls++
    }
  }

  const passRate = (validUrls / SAMPLE_SIZE) * 100

  results.push({
    name: 'URL Format Validation',
    status: passRate === 100 ? 'PASS' : passRate >= 80 ? 'WARN' : 'FAIL',
    details: `${validUrls}/${SAMPLE_SIZE} URLs properly formatted (${passRate.toFixed(1)}%)`,
    score: passRate,
  })
}

// ============================================================================
// TEST 2: METADATA COMPLETENESS
// ============================================================================

async function testMetadataCompleteness() {
  console.log('\n📋 TEST 2: Metadata Completeness\n')

  const { count: total } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  const { count: withTitles } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('guideline_title', 'is', null)
    .neq('guideline_title', '')

  const { count: withUrls } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('url', 'is', null)
    .neq('url', '')

  const { count: withContent } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('chunk_text', 'is', null)
    .neq('chunk_text', '')

  const titleCoverage = ((withTitles! / total!) * 100)
  const urlCoverage = ((withUrls! / total!) * 100)
  const contentCoverage = ((withContent! / total!) * 100)

  console.log(`Total Chunks: ${total}`)
  console.log(`With Titles: ${withTitles} (${titleCoverage.toFixed(1)}%)`)
  console.log(`With URLs: ${withUrls} (${urlCoverage.toFixed(1)}%)`)
  console.log(`With Content: ${withContent} (${contentCoverage.toFixed(1)}%)\n`)

  const avgCoverage = (titleCoverage + urlCoverage + contentCoverage) / 3

  results.push({
    name: 'Metadata Completeness',
    status: avgCoverage >= 95 ? 'PASS' : avgCoverage >= 85 ? 'WARN' : 'FAIL',
    details: `Average coverage: ${avgCoverage.toFixed(1)}% (titles: ${titleCoverage.toFixed(1)}%, URLs: ${urlCoverage.toFixed(1)}%, content: ${contentCoverage.toFixed(1)}%)`,
    score: avgCoverage,
  })
}

// ============================================================================
// TEST 3: DUPLICATE DETECTION
// ============================================================================

async function testDuplicates() {
  console.log('\n🔍 TEST 3: Duplicate Detection\n')

  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, section_heading, chunk_text')
    .limit(1000) // Sample for performance

  if (error) {
    results.push({
      name: 'Duplicate Detection',
      status: 'FAIL',
      details: `Error fetching chunks: ${error.message}`,
    })
    return
  }

  const seen = new Map<string, number>()
  let duplicates = 0

  chunks?.forEach(chunk => {
    const key = `${chunk.guideline_title || ''}|${chunk.section_heading || ''}|${chunk.chunk_text?.substring(0, 100) || ''}`

    if (seen.has(key)) {
      duplicates++
    } else {
      seen.set(key, 1)
    }
  })

  const duplicateRate = (duplicates / 1000) * 100

  console.log(`Sample Size: 1,000 chunks`)
  console.log(`Duplicates Found: ${duplicates}`)
  console.log(`Duplicate Rate: ${duplicateRate.toFixed(2)}%\n`)

  results.push({
    name: 'Duplicate Rate',
    status: duplicateRate < 2 ? 'PASS' : duplicateRate < 5 ? 'WARN' : 'FAIL',
    details: `${duplicates} duplicates in 1,000 chunk sample (${duplicateRate.toFixed(2)}%)`,
    score: 100 - duplicateRate,
  })
}

// ============================================================================
// TEST 4: RETRIEVAL QUALITY
// ============================================================================

async function testRetrievalQuality() {
  console.log('\n🎯 TEST 4: Retrieval Quality\n')

  let successfulQueries = 0
  let totalResults = 0

  for (const query of TEST_QUERIES) {
    console.log(`Query: "${query}"`)

    // Simple text search (since embeddings might not exist yet)
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, url, content_type')
      .textSearch('chunk_text', query.split(' ').slice(0, 3).join(' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3)

    if (!error && data && data.length > 0) {
      successfulQueries++
      totalResults += data.length
      console.log(`  ✅ Found ${data.length} results`)
      data.slice(0, 2).forEach((result, i) => {
        console.log(`     ${i + 1}. ${result.guideline_title || 'Untitled'} (${result.content_type})`)
      })
    } else {
      console.log(`  ❌ No results found`)
    }
    console.log()
  }

  const successRate = (successfulQueries / TEST_QUERIES.length) * 100
  const avgResults = totalResults / TEST_QUERIES.length

  results.push({
    name: 'Retrieval Success Rate',
    status: successRate === 100 ? 'PASS' : successRate >= 75 ? 'WARN' : 'FAIL',
    details: `${successfulQueries}/${TEST_QUERIES.length} queries returned results (avg ${avgResults.toFixed(1)} results/query)`,
    score: successRate,
  })
}

// ============================================================================
// TEST 5: EMBEDDING COVERAGE (if column exists)
// ============================================================================

async function testEmbeddingCoverage() {
  console.log('\n🧠 TEST 5: Embedding Coverage\n')

  try {
    const { count: total } = await supabase
      .from('guideline_chunks')
      .select('*', { count: 'exact', head: true })

    const { count: withEmbeddings } = await supabase
      .from('guideline_chunks')
      .select('*', { count: 'exact', head: true })
      .not('chunk_embedding_vec', 'is', null)

    const coverage = ((withEmbeddings! / total!) * 100)

    console.log(`Total Chunks: ${total}`)
    console.log(`With Embeddings: ${withEmbeddings} (${coverage.toFixed(1)}%)\n`)

    results.push({
      name: 'Embedding Coverage',
      status: coverage >= 95 ? 'PASS' : coverage >= 75 ? 'WARN' : 'FAIL',
      details: `${withEmbeddings}/${total} chunks have embeddings (${coverage.toFixed(1)}%)`,
      score: coverage,
    })

  } catch (error: any) {
    console.log('⚠️  Embedding column does not exist yet\n')
    results.push({
      name: 'Embedding Coverage',
      status: 'WARN',
      details: 'Embedding column not yet created (expected if not implemented yet)',
      score: 0,
    })
  }
}

// ============================================================================
// TEST 6: CONTENT TYPE DISTRIBUTION
// ============================================================================

async function testContentTypeDistribution() {
  console.log('\n📊 TEST 6: Content Type Distribution\n')

  const { data: chunks } = await supabase
    .from('guideline_chunks')
    .select('content_type')

  const distribution = chunks?.reduce((acc, chunk) => {
    acc[chunk.content_type] = (acc[chunk.content_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  console.log('Content Types:')
  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percentage = ((count / chunks!.length) * 100).toFixed(1)
      console.log(`  ${type.padEnd(15)} ${count.toLocaleString().padStart(8)} (${percentage}%)`)
    })
  console.log()

  const hasGuidelines = distribution['guideline'] > 0
  const hasWebinars = distribution['webinar'] > 0
  const hasVariety = Object.keys(distribution).length >= 2

  results.push({
    name: 'Content Type Variety',
    status: hasGuidelines && hasWebinars && hasVariety ? 'PASS' : 'WARN',
    details: `${Object.keys(distribution).length} content types available`,
  })
}

// ============================================================================
// GENERATE FINAL REPORT
// ============================================================================

function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                    TEST RESULTS SUMMARY                    ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const warnings = results.filter(r => r.status === 'WARN').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`❌ Failed: ${failed}\n`)

  console.log('Detailed Results:\n')
  results.forEach((result, i) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️ ' : '❌'
    console.log(`${i + 1}. ${icon} ${result.name}`)
    console.log(`   ${result.details}`)
    if (result.score !== undefined) {
      console.log(`   Score: ${result.score.toFixed(1)}/100`)
    }
    console.log()
  })

  // Calculate overall score
  const scoresWithValues = results.filter(r => r.score !== undefined)
  const avgScore = scoresWithValues.reduce((sum, r) => sum + (r.score || 0), 0) / scoresWithValues.length

  console.log('═'.repeat(60))
  console.log(`\n🎯 OVERALL SCORE: ${avgScore.toFixed(1)}/100\n`)

  if (avgScore >= 90) {
    console.log('✨ EXCELLENT - System is production-ready!')
  } else if (avgScore >= 75) {
    console.log('✅ GOOD - Minor improvements recommended')
  } else if (avgScore >= 60) {
    console.log('⚠️  FAIR - Significant improvements needed')
  } else {
    console.log('❌ POOR - Critical issues require attention')
  }

  console.log('\n═'.repeat(60))

  // Exit with appropriate code
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review and fix issues.\n')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  All tests passed with warnings. Consider addressing warnings.\n')
    process.exit(0)
  } else {
    console.log('\n✅ All tests passed successfully!\n')
    process.exit(0)
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         DATA QUALITY FIXES - COMPREHENSIVE TESTING         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\n📅 Test Date: ${new Date().toISOString().split('T')[0]}`)
  console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`)

  try {
    await testUrlAccessibility()
    await testMetadataCompleteness()
    await testDuplicates()
    await testRetrievalQuality()
    await testEmbeddingCoverage()
    await testContentTypeDistribution()

    generateReport()

  } catch (error) {
    console.error('\n❌ Test suite encountered an error:', error)
    process.exit(1)
  }
}

main()

/**
 * Data Quality Monitoring Script
 * Run this regularly (daily/weekly) to track data quality metrics
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Thresholds for alerts
const THRESHOLDS = {
  embeddingCoverage: 95, // Alert if < 95% have embeddings
  urlCoverage: 90, // Alert if < 90% have URLs
  titleCoverage: 95, // Alert if < 95% have titles
  duplicatePercentage: 2, // Alert if > 2% duplicates
  minQualityScore: 85, // Alert if overall score < 85
}

interface QualityMetrics {
  totalChunks: number
  withEmbeddings: number
  withUrls: number
  withTitles: number
  withValidUrls: number
  duplicates: number
  nullChunkText: number
  avgChunkLength: number
  contentTypeDistribution: Record<string, number>
}

async function collectMetrics(): Promise<QualityMetrics> {
  console.log('Collecting data quality metrics...\n')

  const { count: totalChunks } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  const { count: withEmbeddings } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null)

  const { count: withUrls } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('url', 'is', null)
    .neq('url', '')

  const { count: withTitles } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('guideline_title', 'is', null)
    .neq('guideline_title', '')

  const { count: nullChunkText } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .or('chunk_text.is.null,chunk_text.eq.')

  // Check for valid HTTP URLs
  const { count: withValidUrls } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .like('url', 'http%')

  // Get content type distribution
  const { data: contentTypes } = await supabase
    .from('guideline_chunks')
    .select('content_type')

  const distribution = contentTypes?.reduce((acc, row) => {
    acc[row.content_type] = (acc[row.content_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Sample chunks to calculate average length
  const { data: sampleChunks } = await supabase
    .from('guideline_chunks')
    .select('chunk_text')
    .not('chunk_text', 'is', null)
    .limit(1000)

  const avgChunkLength = sampleChunks
    ? sampleChunks.reduce((sum, chunk) => sum + (chunk.chunk_text?.length || 0), 0) / sampleChunks.length
    : 0

  // Check for duplicates
  const { data: allChunks } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, section_heading, chunk_text')
    .limit(2000) // Sample for performance

  const seen = new Set<string>()
  let duplicates = 0

  allChunks?.forEach(chunk => {
    const key = `${chunk.guideline_title || ''}|${chunk.section_heading || ''}|${chunk.chunk_text?.substring(0, 100) || ''}`
    if (seen.has(key)) {
      duplicates++
    } else {
      seen.add(key)
    }
  })

  return {
    totalChunks: totalChunks || 0,
    withEmbeddings: withEmbeddings || 0,
    withUrls: withUrls || 0,
    withTitles: withTitles || 0,
    withValidUrls: withValidUrls || 0,
    duplicates,
    nullChunkText: nullChunkText || 0,
    avgChunkLength: Math.round(avgChunkLength),
    contentTypeDistribution: distribution,
  }
}

function calculateScore(metrics: QualityMetrics): number {
  const embeddingScore = (metrics.withEmbeddings / metrics.totalChunks) * 30
  const urlScore = (metrics.withValidUrls / metrics.totalChunks) * 25
  const titleScore = (metrics.withTitles / metrics.totalChunks) * 20
  const dedupeScore = Math.max(0, 25 - (metrics.duplicates / metrics.totalChunks) * 100)

  return embeddingScore + urlScore + titleScore + dedupeScore
}

function generateAlerts(metrics: QualityMetrics): string[] {
  const alerts: string[] = []

  const embeddingCoverage = (metrics.withEmbeddings / metrics.totalChunks) * 100
  if (embeddingCoverage < THRESHOLDS.embeddingCoverage) {
    alerts.push(`⚠️  LOW EMBEDDING COVERAGE: ${embeddingCoverage.toFixed(1)}% (threshold: ${THRESHOLDS.embeddingCoverage}%)`)
  }

  const urlCoverage = (metrics.withValidUrls / metrics.totalChunks) * 100
  if (urlCoverage < THRESHOLDS.urlCoverage) {
    alerts.push(`⚠️  LOW URL COVERAGE: ${urlCoverage.toFixed(1)}% (threshold: ${THRESHOLDS.urlCoverage}%)`)
  }

  const titleCoverage = (metrics.withTitles / metrics.totalChunks) * 100
  if (titleCoverage < THRESHOLDS.titleCoverage) {
    alerts.push(`⚠️  LOW TITLE COVERAGE: ${titleCoverage.toFixed(1)}% (threshold: ${THRESHOLDS.titleCoverage}%)`)
  }

  const duplicatePercentage = (metrics.duplicates / metrics.totalChunks) * 100
  if (duplicatePercentage > THRESHOLDS.duplicatePercentage) {
    alerts.push(`⚠️  HIGH DUPLICATE RATE: ${duplicatePercentage.toFixed(1)}% (threshold: ${THRESHOLDS.duplicatePercentage}%)`)
  }

  const score = calculateScore(metrics)
  if (score < THRESHOLDS.minQualityScore) {
    alerts.push(`⚠️  LOW QUALITY SCORE: ${score.toFixed(1)}/100 (threshold: ${THRESHOLDS.minQualityScore})`)
  }

  if (metrics.nullChunkText > 0) {
    alerts.push(`⚠️  NULL CHUNK TEXT: ${metrics.nullChunkText} chunks have no content`)
  }

  if (metrics.avgChunkLength < 100) {
    alerts.push(`⚠️  SHORT CHUNKS: Average length is ${metrics.avgChunkLength} characters`)
  }

  return alerts
}

function printReport(metrics: QualityMetrics) {
  const score = calculateScore(metrics)

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              DATA QUALITY MONITORING REPORT                ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\n📅 Report Date: ${new Date().toISOString().split('T')[0]}`)
  console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`)

  console.log('📊 OVERVIEW')
  console.log('─'.repeat(60))
  console.log(`  Total Chunks: ${metrics.totalChunks.toLocaleString()}`)
  console.log(`  Overall Quality Score: ${score.toFixed(1)}/100`)

  if (score >= 85) {
    console.log('  Status: ✅ EXCELLENT')
  } else if (score >= 70) {
    console.log('  Status: ✅ GOOD')
  } else if (score >= 50) {
    console.log('  Status: ⚠️  FAIR')
  } else {
    console.log('  Status: ❌ POOR')
  }

  console.log('\n📈 COVERAGE METRICS')
  console.log('─'.repeat(60))
  console.log(`  Embeddings:  ${metrics.withEmbeddings.toLocaleString()} / ${metrics.totalChunks.toLocaleString()} (${((metrics.withEmbeddings / metrics.totalChunks) * 100).toFixed(1)}%)`)
  console.log(`  Valid URLs:  ${metrics.withValidUrls.toLocaleString()} / ${metrics.totalChunks.toLocaleString()} (${((metrics.withValidUrls / metrics.totalChunks) * 100).toFixed(1)}%)`)
  console.log(`  Titles:      ${metrics.withTitles.toLocaleString()} / ${metrics.totalChunks.toLocaleString()} (${((metrics.withTitles / metrics.totalChunks) * 100).toFixed(1)}%)`)

  console.log('\n📋 CONTENT QUALITY')
  console.log('─'.repeat(60))
  console.log(`  Duplicates (sample): ${metrics.duplicates} (${((metrics.duplicates / 2000) * 100).toFixed(1)}% of sampled)`)
  console.log(`  Null chunk text:     ${metrics.nullChunkText}`)
  console.log(`  Avg chunk length:    ${metrics.avgChunkLength} characters`)

  console.log('\n📚 CONTENT TYPE DISTRIBUTION')
  console.log('─'.repeat(60))
  Object.entries(metrics.contentTypeDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percentage = ((count / metrics.totalChunks) * 100).toFixed(1)
      console.log(`  ${type.padEnd(15)} ${count.toLocaleString().padStart(10)} (${percentage}%)`)
    })

  const alerts = generateAlerts(metrics)

  if (alerts.length > 0) {
    console.log('\n🚨 ALERTS')
    console.log('─'.repeat(60))
    alerts.forEach(alert => console.log(`  ${alert}`))
  } else {
    console.log('\n✅ NO ALERTS - All metrics within acceptable ranges')
  }

  console.log('\n' + '═'.repeat(60))
  console.log('End of Report')
  console.log('═'.repeat(60) + '\n')
}

async function saveMetricsToDatabase(metrics: QualityMetrics) {
  const score = calculateScore(metrics)
  const alerts = generateAlerts(metrics)

  // Save to a monitoring table (create if doesn't exist)
  const { error } = await supabase
    .from('data_quality_metrics')
    .insert({
      measured_at: new Date().toISOString(),
      total_chunks: metrics.totalChunks,
      with_embeddings: metrics.withEmbeddings,
      with_urls: metrics.withValidUrls,
      with_titles: metrics.withTitles,
      duplicates: metrics.duplicates,
      quality_score: score,
      alerts: alerts,
      content_distribution: metrics.contentTypeDistribution,
    })

  if (error) {
    // Table might not exist - that's okay for now
    if (error.message && !error.message.includes('does not exist')) {
      console.warn('Could not save metrics to database:', error.message)
    }
  } else {
    console.log('✓ Metrics saved to database for historical tracking')
  }
}

async function main() {
  try {
    const metrics = await collectMetrics()
    printReport(metrics)
    await saveMetricsToDatabase(metrics)

    const score = calculateScore(metrics)
    const alerts = generateAlerts(metrics)

    // Exit with error code if critical issues
    if (score < 50 || alerts.length > 3) {
      console.error('\n❌ Critical data quality issues detected!')
      process.exit(1)
    }

  } catch (error) {
    console.error('Error running data quality monitoring:', error)
    process.exit(1)
  }
}

main()

/**
 * Master script to fix all data quality issues
 * Runs all fixes in sequence with progress tracking
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiKey = process.env.OPENAI_API_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)
const openai = new OpenAI({ apiKey: openaiKey })

// Configuration
const BATCH_SIZE = 100 // Process embeddings in batches
const EMBEDDING_MODEL = 'text-embedding-3-small' // Cheaper, faster model
const MAX_RETRIES = 3

// Progress tracking
let totalProcessed = 0
let totalErrors = 0

// ============================================================================
// 1. GENERATE EMBEDDINGS
// ============================================================================

async function generateEmbeddings() {
  console.log('\n=== STEP 1: GENERATING EMBEDDINGS ===\n')

  // Get chunks without embeddings
  const { data: chunks, error, count } = await supabase
    .from('guideline_chunks')
    .select('id, chunk_text', { count: 'exact' })
    .is('embedding', null)
    .not('chunk_text', 'is', null)
    .neq('chunk_text', '')

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  console.log(`Found ${count || 0} chunks without embeddings`)

  if (!chunks || chunks.length === 0) {
    console.log('✓ All chunks already have embeddings!')
    return
  }

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`)
    console.log(`Chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)} of ${chunks.length}`)

    try {
      // Generate embeddings for batch
      const texts = batch.map(chunk =>
        chunk.chunk_text?.substring(0, 8000) || '' // OpenAI limit is 8191 tokens
      )

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      })

      // Update database
      const updates = batch.map((chunk, idx) => ({
        id: chunk.id,
        embedding: response.data[idx].embedding,
      }))

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('guideline_chunks')
          .update({ embedding: update.embedding })
          .eq('id', update.id)

        if (updateError) {
          console.error(`Error updating chunk ${update.id}:`, updateError)
          totalErrors++
        } else {
          totalProcessed++
        }
      }

      console.log(`✓ Processed ${batch.length} chunks (Total: ${totalProcessed})`)

      // Rate limiting - be nice to OpenAI API
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }

    } catch (error: any) {
      console.error(`Error processing batch:`, error.message)
      totalErrors += batch.length

      // If rate limited, wait longer
      if (error?.status === 429) {
        console.log('Rate limited, waiting 30 seconds...')
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }
  }

  console.log(`\n✓ Embedding generation complete`)
  console.log(`  Processed: ${totalProcessed}`)
  console.log(`  Errors: ${totalErrors}`)
}

// ============================================================================
// 2. FIX URL FORMATTING
// ============================================================================

async function fixUrls() {
  console.log('\n=== STEP 2: FIXING URL FORMATTING ===\n')

  const BASE_NCCN_URL = 'https://storage.googleapis.com/navis-health-content/'

  // Get chunks with file path URLs
  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('id, url')
    .not('url', 'is', null)
    .neq('url', '')
    .or('url.like.NCCN_%,url.like.%.pdf')
    .limit(5000)

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  console.log(`Found ${chunks?.length || 0} chunks with file path URLs`)

  if (!chunks || chunks.length === 0) {
    console.log('✓ No URLs need fixing!')
    return
  }

  let fixed = 0
  let skipped = 0

  for (const chunk of chunks) {
    // Skip if already a valid URL
    if (chunk.url.startsWith('http://') || chunk.url.startsWith('https://')) {
      skipped++
      continue
    }

    // Convert file path to URL
    const newUrl = `${BASE_NCCN_URL}${chunk.url}`

    const { error: updateError } = await supabase
      .from('guideline_chunks')
      .update({ url: newUrl })
      .eq('id', chunk.id)

    if (updateError) {
      console.error(`Error updating URL for chunk ${chunk.id}:`, updateError)
      totalErrors++
    } else {
      fixed++
      if (fixed % 100 === 0) {
        console.log(`  Fixed ${fixed} URLs...`)
      }
    }
  }

  console.log(`\n✓ URL fixing complete`)
  console.log(`  Fixed: ${fixed}`)
  console.log(`  Skipped (already valid): ${skipped}`)
}

// ============================================================================
// 3. REMOVE DUPLICATES
// ============================================================================

async function removeDuplicates() {
  console.log('\n=== STEP 3: REMOVING DUPLICATES ===\n')

  // Get all chunks
  const { data: allChunks, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, section_heading, chunk_text')
    .order('id', { ascending: true }) // Keep first by ID

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  console.log(`Analyzing ${allChunks?.length || 0} chunks for duplicates...`)

  if (!allChunks) return

  // Find duplicates
  const seen = new Map<string, string>() // key -> first id
  const duplicateIds: string[] = []

  for (const chunk of allChunks) {
    const key = `${chunk.guideline_title || ''}|${chunk.section_heading || ''}|${chunk.chunk_text?.substring(0, 200) || ''}`

    if (seen.has(key)) {
      duplicateIds.push(chunk.id) // Mark as duplicate
    } else {
      seen.set(key, chunk.id) // First occurrence
    }
  }

  console.log(`Found ${duplicateIds.length} duplicate chunks`)

  if (duplicateIds.length === 0) {
    console.log('✓ No duplicates found!')
    return
  }

  // Delete in batches
  const DELETE_BATCH_SIZE = 100
  let deleted = 0

  for (let i = 0; i < duplicateIds.length; i += DELETE_BATCH_SIZE) {
    const batch = duplicateIds.slice(i, i + DELETE_BATCH_SIZE)

    const { error: deleteError } = await supabase
      .from('guideline_chunks')
      .delete()
      .in('id', batch)

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError)
      totalErrors += batch.length
    } else {
      deleted += batch.length
      console.log(`  Deleted ${deleted}/${duplicateIds.length} duplicates...`)
    }
  }

  console.log(`\n✓ Deduplication complete`)
  console.log(`  Deleted: ${deleted} duplicate chunks`)
}

// ============================================================================
// 4. BACKFILL MISSING METADATA
// ============================================================================

async function backfillMetadata() {
  console.log('\n=== STEP 4: BACKFILLING MISSING METADATA ===\n')

  // Get chunks with missing titles but have URLs
  const { data: chunks, error } = await supabase
    .from('guideline_chunks')
    .select('id, url, guideline_title, chunk_text')
    .or('guideline_title.is.null,guideline_title.eq.')
    .not('url', 'is', null)
    .limit(1000)

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  console.log(`Found ${chunks?.length || 0} chunks with missing metadata`)

  if (!chunks || chunks.length === 0) {
    console.log('✓ No metadata needs backfilling!')
    return
  }

  let backfilled = 0

  for (const chunk of chunks) {
    let newTitle = chunk.guideline_title

    // Try to extract title from URL
    if (!newTitle && chunk.url) {
      const urlParts = chunk.url.split('/')
      const filename = urlParts[urlParts.length - 1]

      // Remove file extension and clean up
      newTitle = filename
        .replace(/\.(pdf|html)$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/^\d+_/, '') // Remove leading numbers
        .trim()

      // Capitalize
      newTitle = newTitle
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    // Try to extract from chunk text (first line)
    if (!newTitle && chunk.chunk_text) {
      const firstLine = chunk.chunk_text.split('\n')[0].trim()
      if (firstLine.length < 100 && firstLine.length > 5) {
        newTitle = firstLine
      }
    }

    // Update if we found a title
    if (newTitle && newTitle !== chunk.guideline_title) {
      const { error: updateError } = await supabase
        .from('guideline_chunks')
        .update({ guideline_title: newTitle })
        .eq('id', chunk.id)

      if (updateError) {
        console.error(`Error updating metadata for chunk ${chunk.id}:`, updateError)
        totalErrors++
      } else {
        backfilled++
        if (backfilled % 50 === 0) {
          console.log(`  Backfilled ${backfilled} chunks...`)
        }
      }
    }
  }

  console.log(`\n✓ Metadata backfill complete`)
  console.log(`  Backfilled: ${backfilled} chunks`)
}

// ============================================================================
// 5. FINAL QUALITY CHECK
// ============================================================================

async function finalQualityCheck() {
  console.log('\n=== STEP 5: FINAL QUALITY CHECK ===\n')

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

  console.log('Final Data Quality Metrics:')
  console.log(`  Total chunks: ${totalChunks}`)
  console.log(`  With embeddings: ${withEmbeddings} (${((withEmbeddings! / totalChunks!) * 100).toFixed(1)}%)`)
  console.log(`  With URLs: ${withUrls} (${((withUrls! / totalChunks!) * 100).toFixed(1)}%)`)
  console.log(`  With titles: ${withTitles} (${((withTitles! / totalChunks!) * 100).toFixed(1)}%)`)

  // Calculate overall score
  const embeddingScore = (withEmbeddings! / totalChunks!) * 25
  const urlScore = (withUrls! / totalChunks!) * 25
  const titleScore = (withTitles! / totalChunks!) * 25
  const completenessScore = 25 // Base score for no nulls in chunk_text

  const totalScore = embeddingScore + urlScore + titleScore + completenessScore

  console.log(`\n📊 Overall Data Quality Score: ${totalScore.toFixed(1)}/100`)

  if (totalScore >= 85) {
    console.log('✅ EXCELLENT - Production ready!')
  } else if (totalScore >= 70) {
    console.log('✅ GOOD - Minor improvements needed')
  } else if (totalScore >= 50) {
    console.log('⚠️  FAIR - Significant improvements needed')
  } else {
    console.log('❌ POOR - Critical issues remain')
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║          DATA QUALITY FIX - COMPREHENSIVE SCRIPT           ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  const startTime = Date.now()

  try {
    // Run all fixes in sequence
    await generateEmbeddings()
    await fixUrls()
    await removeDuplicates()
    await backfillMetadata()
    await finalQualityCheck()

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2)

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                     ALL FIXES COMPLETE                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log(`\n⏱️  Total time: ${duration} minutes`)
    console.log(`✓  Total processed: ${totalProcessed}`)
    console.log(`❌ Total errors: ${totalErrors}`)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()

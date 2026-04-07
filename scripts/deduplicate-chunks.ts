/**
 * Deduplication script for guideline_chunks
 * Removes duplicate entries based on content similarity
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function deduplicate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              DEDUPLICATION - REMOVE DUPLICATES             ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log('Step 1: Fetching all chunks...\n')

  // Get count first
  const { count: totalCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  console.log(`Total chunks in database: ${totalCount}\n`)

  // Get all chunks ordered by ID (keep first occurrence)
  // Supabase has a default limit of 1000, we need to fetch all
  let allChunks: any[] = []
  const FETCH_BATCH_SIZE = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('id, guideline_title, section_heading, chunk_text')
      .order('id', { ascending: true })
      .range(offset, offset + FETCH_BATCH_SIZE - 1)

    if (error) {
      console.error('❌ Error fetching chunks:', error)
      return
    }

    if (data && data.length > 0) {
      allChunks = allChunks.concat(data)
      offset += FETCH_BATCH_SIZE
      console.log(`  Fetched ${allChunks.length}/${totalCount} chunks...`)

      if (data.length < FETCH_BATCH_SIZE) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  console.log(`\n✓ Fetched ${allChunks.length} chunks total\n`)

  console.log('Step 2: Identifying duplicates...\n')

  // Find duplicates using a hash of key fields
  const seen = new Map<string, string>() // hash -> first chunk ID
  const duplicateIds: string[] = []
  const duplicateGroups: Array<{ key: string; ids: string[] }> = []

  for (const chunk of allChunks || []) {
    // Create a unique key from title, section, and first 200 chars of content
    const key = `${chunk.guideline_title || 'NOTITLE'}|${chunk.section_heading || 'NOSECTION'}|${(chunk.chunk_text || '').substring(0, 200)}`

    if (seen.has(key)) {
      // This is a duplicate
      duplicateIds.push(chunk.id)

      // Track for reporting
      const existingGroup = duplicateGroups.find(g => g.key === key)
      if (existingGroup) {
        existingGroup.ids.push(chunk.id)
      } else {
        duplicateGroups.push({ key, ids: [seen.get(key)!, chunk.id] })
      }
    } else {
      // First occurrence - keep this one
      seen.set(key, chunk.id)
    }
  }

  console.log(`Found ${duplicateIds.length} duplicate chunks`)
  console.log(`In ${duplicateGroups.length} duplicate groups\n`)

  if (duplicateIds.length === 0) {
    console.log('✅ No duplicates found! Database is clean.\n')
    return
  }

  // Show sample duplicate groups
  console.log('Sample duplicate groups (showing first 5):\n')
  duplicateGroups.slice(0, 5).forEach((group, idx) => {
    const firstChunk = allChunks?.find(c => c.id === group.ids[0])
    console.log(`Group ${idx + 1}:`)
    console.log(`  Title: ${firstChunk?.guideline_title || 'Untitled'}`)
    console.log(`  Section: ${firstChunk?.section_heading || 'N/A'}`)
    console.log(`  Duplicate count: ${group.ids.length}`)
    console.log(`  IDs: ${group.ids.join(', ')}`)
    console.log()
  })

  if (duplicateGroups.length > 5) {
    console.log(`... and ${duplicateGroups.length - 5} more groups\n`)
  }

  console.log('Step 3: Deleting duplicates...\n')

  // Delete in batches of 100 for safety
  const BATCH_SIZE = 100
  let deleted = 0
  let errors = 0

  for (let i = 0; i < duplicateIds.length; i += BATCH_SIZE) {
    const batch = duplicateIds.slice(i, i + BATCH_SIZE)

    const { error: deleteError, count } = await supabase
      .from('guideline_chunks')
      .delete({ count: 'exact' })
      .in('id', batch)

    if (deleteError) {
      console.error(`❌ Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, deleteError.message)
      errors += batch.length
    } else {
      deleted += batch.length
      console.log(`  ✓ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(duplicateIds.length / BATCH_SIZE)} (${deleted}/${duplicateIds.length} total)`)
    }

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < duplicateIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                  DEDUPLICATION COMPLETE                    ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`✅ Successfully deleted: ${deleted} duplicate chunks`)
  if (errors > 0) {
    console.log(`❌ Errors encountered: ${errors} chunks`)
  }

  // Show before/after stats
  const { count: newTotal } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  console.log(`\nDatabase Summary:`)
  console.log(`  Before: ${allChunks?.length || 0} chunks`)
  console.log(`  After:  ${newTotal || 0} chunks`)
  console.log(`  Removed: ${deleted} duplicates (${((deleted / (allChunks?.length || 1)) * 100).toFixed(1)}%)\n`)

  // Run a quick duplicate check to verify
  console.log('Verification: Running duplicate check...\n')

  const { data: verifyChunks } = await supabase
    .from('guideline_chunks')
    .select('guideline_title, section_heading, chunk_text')
    .limit(1000)

  const verifyMap = new Map<string, number>()
  let remainingDupes = 0

  verifyChunks?.forEach(chunk => {
    const key = `${chunk.guideline_title || ''}|${chunk.section_heading || ''}|${(chunk.chunk_text || '').substring(0, 200)}`
    if (verifyMap.has(key)) {
      remainingDupes++
    } else {
      verifyMap.set(key, 1)
    }
  })

  if (remainingDupes === 0) {
    console.log('✅ Verification passed: No duplicates found in sample of 1,000 chunks\n')
  } else {
    console.log(`⚠️  Found ${remainingDupes} potential duplicates in verification sample`)
    console.log('   (May need another deduplication pass)\n')
  }
}

async function main() {
  try {
    await deduplicate()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()

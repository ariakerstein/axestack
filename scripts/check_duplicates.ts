import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  console.log('=== CHECKING FOR DUPLICATES IN GUIDELINE_CHUNKS ===\n')

  // Check for duplicate combinations of guideline_title, section_heading, and content
  const { data: duplicates, error } = await supabase.rpc('check_duplicate_chunks', {})

  if (error) {
    // If RPC doesn't exist, run raw query
    const { data, error: queryError } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, section_heading, chunk_text, content_type, url, id')
      .order('guideline_title')
      .limit(1000)

    if (queryError) {
      console.error('Error fetching data:', queryError)
      return
    }

    // Manual duplicate detection
    const seen = new Map()
    const duplicateGroups = new Map()

    data?.forEach(row => {
      const key = `${row.guideline_title}|${row.section_heading}|${row.chunk_text?.substring(0, 100)}`

      if (seen.has(key)) {
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, [seen.get(key)])
        }
        duplicateGroups.get(key).push(row)
      } else {
        seen.set(key, row)
      }
    })

    if (duplicateGroups.size === 0) {
      console.log('✓ No exact duplicates found (checked first 1000 rows)')
    } else {
      console.log(`⚠️  Found ${duplicateGroups.size} duplicate groups:\n`)

      let count = 0
      for (const [key, rows] of duplicateGroups.entries()) {
        if (count++ < 5) { // Show first 5 duplicate groups
          console.log(`Duplicate Group ${count}:`)
          console.log(`  Title: ${rows[0].guideline_title}`)
          console.log(`  Section: ${rows[0].section_heading}`)
          console.log(`  URL: ${rows[0].url}`)
          console.log(`  Content Type: ${rows[0].content_type}`)
          console.log(`  IDs: ${rows.map(r => r.id).join(', ')}`)
          console.log(`  Count: ${rows.length} duplicates\n`)
        }
      }

      if (duplicateGroups.size > 5) {
        console.log(`... and ${duplicateGroups.size - 5} more duplicate groups\n`)
      }
    }
  }

  // Check content type distribution
  console.log('\n=== CONTENT TYPE DISTRIBUTION ===\n')
  const { data: contentTypes, error: ctError } = await supabase
    .from('guideline_chunks')
    .select('content_type')

  if (!ctError && contentTypes) {
    const distribution = contentTypes.reduce((acc, row) => {
      acc[row.content_type] = (acc[row.content_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} chunks`)
      })
  }

  // Check for null or empty critical fields
  console.log('\n=== DATA QUALITY CHECKS ===\n')

  const { count: nullTitleCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .or('guideline_title.is.null,guideline_title.eq.')

  const { count: nullUrlCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .or('url.is.null,url.eq.')

  const { count: nullContentCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .or('chunk_text.is.null,chunk_text.eq.')

  console.log(`  Rows with null/empty guideline_title: ${nullTitleCount || 0}`)
  console.log(`  Rows with null/empty url: ${nullUrlCount || 0}`)
  console.log(`  Rows with null/empty chunk_text: ${nullContentCount || 0}`)
}

checkDuplicates()

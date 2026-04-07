import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Test questions covering different scenarios
const testQuestions = [
  {
    category: 'Clinical Trials',
    question: 'How do I find the best clinical trial for my cancer?',
    expectedKeywords: ['clinical trial', 'finding', 'match']
  },
  {
    category: 'Treatment Options',
    question: 'What are the latest treatment options for lung cancer?',
    expectedKeywords: ['lung cancer', 'treatment', 'therapy']
  },
  {
    category: 'NCCN Guidelines',
    question: 'What are the NCCN guidelines for breast cancer treatment?',
    expectedKeywords: ['NCCN', 'breast cancer', 'guideline']
  },
  {
    category: 'Biomarkers',
    question: 'What biomarker testing should I get for colorectal cancer?',
    expectedKeywords: ['biomarker', 'testing', 'colorectal']
  },
  {
    category: 'Webinar Content',
    question: 'What did the webinar about clinical trials discuss?',
    expectedKeywords: ['clinical trial', 'webinar']
  }
]

async function testSourceAttribution() {
  console.log('=== TESTING SOURCE ATTRIBUTION ===\n')

  // Get a sample of chunks with URLs
  const { data: chunksWithUrls, error } = await supabase
    .from('guideline_chunks')
    .select('id, guideline_title, url, content_type')
    .not('url', 'is', null)
    .neq('url', '')
    .limit(10)

  if (error) {
    console.error('Error fetching chunks:', error)
    return
  }

  console.log(`✓ Found ${chunksWithUrls?.length || 0} chunks with URLs\n`)

  if (chunksWithUrls && chunksWithUrls.length > 0) {
    console.log('Sample URLs:')
    chunksWithUrls.slice(0, 5).forEach((chunk, i) => {
      console.log(`  ${i + 1}. ${chunk.guideline_title}`)
      console.log(`     URL: ${chunk.url}`)
      console.log(`     Type: ${chunk.content_type}\n`)
    })
  }

  // Check URL patterns
  const urlPatterns = new Map()
  chunksWithUrls?.forEach(chunk => {
    try {
      const domain = new URL(chunk.url).hostname
      urlPatterns.set(domain, (urlPatterns.get(domain) || 0) + 1)
    } catch (e) {
      console.log(`⚠️  Invalid URL format: ${chunk.url}`)
    }
  })

  console.log('URL domain distribution:')
  Array.from(urlPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} chunks`)
    })
}

async function testContentTypeQuality() {
  console.log('\n\n=== TESTING CONTENT TYPE QUALITY ===\n')

  const contentTypes = ['guideline', 'webinar', 'article']

  for (const type of contentTypes) {
    const { data, error, count } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, section_heading, url', { count: 'exact' })
      .eq('content_type', type)
      .limit(3)

    console.log(`\n${type.toUpperCase()} content:`)
    console.log(`  Total chunks: ${count || 0}`)

    if (data && data.length > 0) {
      console.log('  Sample entries:')
      data.forEach((item, i) => {
        console.log(`    ${i + 1}. Title: ${item.guideline_title || 'N/A'}`)
        console.log(`       Section: ${item.section_heading || 'N/A'}`)
        console.log(`       URL: ${item.url || 'N/A'}`)
      })
    }
  }
}

async function testQuestionRetrieval() {
  console.log('\n\n=== TESTING QUESTION-BASED RETRIEVAL ===\n')

  for (const test of testQuestions) {
    console.log(`\nQuestion: "${test.question}"`)
    console.log(`Category: ${test.category}`)

    // Perform a similarity search (simplified - would use embedding in real system)
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('guideline_title, section_heading, url, content_type, chunk_text')
      .textSearch('chunk_text', test.expectedKeywords.join(' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3)

    if (error) {
      console.log(`  ⚠️  Error: ${error.message}`)
      continue
    }

    if (!data || data.length === 0) {
      console.log('  ⚠️  No results found')
      continue
    }

    console.log(`  ✓ Found ${data.length} relevant chunks:`)
    data.forEach((chunk, i) => {
      console.log(`    ${i + 1}. ${chunk.guideline_title || 'Untitled'}`)
      console.log(`       Type: ${chunk.content_type}`)
      console.log(`       URL: ${chunk.url || 'No URL'}`)
      console.log(`       Preview: ${chunk.chunk_text?.substring(0, 100)}...`)
    })
  }
}

async function checkEmbeddingCoverage() {
  console.log('\n\n=== CHECKING EMBEDDING COVERAGE ===\n')

  const { count: totalCount } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })

  const { count: withEmbeddings } = await supabase
    .from('guideline_chunks')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null)

  console.log(`  Total chunks: ${totalCount || 0}`)
  console.log(`  Chunks with embeddings: ${withEmbeddings || 0}`)

  if (totalCount && withEmbeddings) {
    const coverage = ((withEmbeddings / totalCount) * 100).toFixed(2)
    console.log(`  Coverage: ${coverage}%`)

    if (coverage === '100.00') {
      console.log('  ✓ Full embedding coverage')
    } else {
      console.log(`  ⚠️  Missing embeddings for ${totalCount - withEmbeddings} chunks`)
    }
  }
}

async function runAllTests() {
  try {
    await testSourceAttribution()
    await testContentTypeQuality()
    await testQuestionRetrieval()
    await checkEmbeddingCoverage()

    console.log('\n\n=== TEST SUMMARY ===')
    console.log('✓ All tests completed')
    console.log('\nRecommendations based on findings will be printed above.')
  } catch (error) {
    console.error('Error running tests:', error)
  }
}

runAllTests()

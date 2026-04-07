/**
 * Test RAG Vector Search for OpenOnco Content
 *
 * Verifies that diagnostic tests appear in RAG search results alongside NCCN guidelines.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... npx tsx scripts/test-openonco-rag-search.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

interface TestResult {
  query: string;
  passed: boolean;
  totalResults: number;
  openoncoResults: number;
  message: string;
}

async function testRAGSearch() {
  console.log('🔍 Testing RAG Vector Search for OpenOnco Content\n');
  console.log('='.repeat(60));

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  const queries = [
    {
      text: 'What MRD tests are available for breast cancer?',
      expectOpenOnco: true,
      expectedMinMatches: 2,
    },
    {
      text: 'Which early detection tests can screen for multiple cancers?',
      expectOpenOnco: true,
      expectedMinMatches: 1,
    },
    {
      text: 'Natera Signatera blood test tumor-informed MRD',
      expectOpenOnco: true,
      expectedMinMatches: 1,
    },
    {
      text: 'What genomic profiling tests are available?',
      expectOpenOnco: true,
      expectedMinMatches: 2,
    },
    {
      text: 'ctDNA monitoring tests for treatment response',
      expectOpenOnco: true,
      expectedMinMatches: 1,
    },
  ];

  const results: TestResult[] = [];

  for (const query of queries) {
    console.log('\n📝 Query:', query.text);
    console.log('-'.repeat(50));

    try {
      const embedding = await generateEmbedding(query.text);

      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 10,
      });

      if (error) {
        console.log('  ❌ Error:', error.message);
        results.push({
          query: query.text,
          passed: false,
          totalResults: 0,
          openoncoResults: 0,
          message: error.message,
        });
        continue;
      }

      const openoncoResults = data?.filter((c: any) => c.guideline_source === 'OpenOnco') || [];
      const otherResults = data?.filter((c: any) => c.guideline_source !== 'OpenOnco') || [];

      console.log('  Total results:', data?.length || 0);
      console.log('  🧪 OpenOnco results:', openoncoResults.length);
      console.log('  📄 NCCN/other results:', otherResults.length);

      if (openoncoResults.length > 0) {
        console.log('\n  Top OpenOnco matches:');
        openoncoResults.slice(0, 3).forEach((chunk: any, i: number) => {
          const title = chunk.guideline_title.substring(0, 55);
          const score = (chunk.similarity * 100).toFixed(1);
          console.log(`    ${i + 1}. ${title}... (${score}%)`);
        });
      }

      const passed = query.expectOpenOnco
        ? openoncoResults.length >= query.expectedMinMatches
        : true;

      results.push({
        query: query.text,
        passed,
        totalResults: data?.length || 0,
        openoncoResults: openoncoResults.length,
        message: passed
          ? `Found ${openoncoResults.length} OpenOnco results`
          : `Expected ${query.expectedMinMatches}+ OpenOnco results, got ${openoncoResults.length}`,
      });

      console.log('\n  Result:', passed ? '✅ PASSED' : '❌ FAILED');

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err: any) {
      console.log('  ❌ Error:', err.message);
      results.push({
        query: query.text,
        passed: false,
        totalResults: 0,
        openoncoResults: 0,
        message: err.message,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RAG Search Test Results\n');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`  ✅ Passed: ${passedCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
  console.log(`  📈 Score: ${Math.round((passedCount / results.length) * 100)}%`);

  if (failedCount === 0) {
    console.log('\n🎉 All RAG search tests passed! OpenOnco content is discoverable.');
  } else {
    console.log('\n⚠️  Some tests failed:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - "${r.query.substring(0, 40)}...": ${r.message}`);
    });
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

testRAGSearch().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

/**
 * Test script to diagnose BAT search issue
 */

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDU3MDMsImV4cCI6MjA0NzI4MTcwM30.I_evbWYpUiKj-RQCcDN1o41TS0Y2VLsV-E9_MSVP0e8';

async function testSearch(question: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: "${question}"`);
  console.log(`${'='.repeat(60)}`);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      question,
      model: 'claude-3-5-haiku',
      cancerType: 'prostate',
      conversationHistory: [],
    }),
  });

  const data = await res.json();

  console.log(`Search Method: ${data.searchMethod}`);
  console.log(`Chunks Used: ${data.chunksUsed}`);
  console.log(`Latency: ${data.totalLatencyMs}ms`);
  console.log(`\nTop Citations:`);
  (data.citations || []).slice(0, 5).forEach((c: string, i: number) => {
    console.log(`  ${i + 1}. ${c}`);
  });

  console.log(`\nSearch Optimization:`);
  console.log(JSON.stringify(data.searchOptimization, null, 2));

  console.log(`\nAnswer Preview:`);
  console.log(data.answer?.substring(0, 300) + '...');
}

async function main() {
  // Test 1: Just the acronym
  await testSearch('What is BAT?');

  // Test 2: Expanded version
  await testSearch('What is Bipolar Androgen Therapy?');

  // Test 3: With more context
  await testSearch('Tell me about BAT treatment for prostate cancer');

  // Test 4: Direct webinar reference
  await testSearch('What does the BAT webinar say about treatment?');
}

main().catch(console.error);

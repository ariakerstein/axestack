/**
 * Get detailed latency breakdown from direct-navis
 */

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDU3MDMsImV4cCI6MjA0NzI4MTcwM30.I_evbWYpUiKj-RQCcDN1o41TS0Y2VLsV-E9_MSVP0e8';

async function testLatency(question: string) {
  const start = Date.now();

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

  const totalTime = Date.now() - start;
  const data = await res.json();

  return { totalTime, data };
}

async function main() {
  console.log('='.repeat(70));
  console.log('DETAILED LATENCY BREAKDOWN');
  console.log('='.repeat(70));

  const questions = [
    'What is a Gleason score?',
    'What are prostate cancer treatment options?',
    'What is active surveillance?',
  ];

  for (const q of questions) {
    console.log(`\nQuery: "${q}"`);
    console.log('-'.repeat(60));

    const { totalTime, data } = await testLatency(q);

    // Extract all latency info
    const latency = data.latency || {};
    const debug = data.debug || {};
    const searchDebug = debug.search || {};

    console.log(`\nTOTAL TIME: ${totalTime}ms`);
    console.log(`\nBreakdown from response:`);

    if (latency.total) console.log(`  Total (server):      ${latency.total}ms`);
    if (latency.search) console.log(`  Search:              ${latency.search}ms`);
    if (latency.llm) console.log(`  LLM:                 ${latency.llm}ms`);
    if (latency.evaluation) console.log(`  Evaluation:          ${latency.evaluation}ms`);

    console.log(`\nSearch details:`);
    if (searchDebug.timeMs) console.log(`  Search time:         ${searchDebug.timeMs}ms`);
    if (searchDebug.method) console.log(`  Method:              ${searchDebug.method}`);
    if (searchDebug.strategy) console.log(`  Strategy:            ${searchDebug.strategy}`);
    if (searchDebug.chunksFound !== undefined) console.log(`  Chunks found:        ${searchDebug.chunksFound}`);

    // Print full debug object for analysis
    console.log(`\nFull debug data:`);
    console.log(JSON.stringify({
      latency: data.latency,
      searchMetadata: data.searchMetadata,
      debug: data.debug,
    }, null, 2));
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);

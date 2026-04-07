/**
 * Quick latency test for Gemini 2.5 Flash
 */

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDU3MDMsImV4cCI6MjA0NzI4MTcwM30.I_evbWYpUiKj-RQCcDN1o41TS0Y2VLsV-E9_MSVP0e8';

const questions = [
  'What is PSA testing?',
  'What are common side effects of radiation therapy?',
  'How does immunotherapy work for cancer?',
  'What is a Gleason score?',
  'What are treatment options for metastatic prostate cancer?',
];

async function testQuery(question: string): Promise<{ question: string; latencyMs: number; success: boolean; preview: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question,
        model: 'gemini-2.5-flash',
        cancerType: 'prostate',
        conversationHistory: [],
      }),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json();

    return {
      question: question.substring(0, 50),
      latencyMs,
      success: res.ok,
      preview: (data.answer || data.error || '').substring(0, 100),
    };
  } catch (err: any) {
    return {
      question: question.substring(0, 50),
      latencyMs: Date.now() - start,
      success: false,
      preview: err.message,
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('GEMINI 2.5 FLASH LATENCY TEST');
  console.log('='.repeat(70));
  console.log();

  const results: number[] = [];

  for (const q of questions) {
    const result = await testQuery(q);
    results.push(result.latencyMs);

    console.log(`[${result.latencyMs}ms] ${result.question}`);
    console.log(`  ${result.success ? '✓' : '✗'} ${result.preview}...`);
    console.log();
  }

  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Queries: ${results.length}`);
  console.log(`  Average: ${avg.toFixed(0)}ms`);
  console.log(`  Min:     ${min}ms`);
  console.log(`  Max:     ${max}ms`);
  console.log('='.repeat(70));
}

main().catch(console.error);

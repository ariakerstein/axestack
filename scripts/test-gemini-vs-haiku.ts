/**
 * Test script to compare Gemini vs Claude Haiku responses
 * Run: npx ts-node scripts/test-gemini-vs-haiku.ts
 */

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDU3MDMsImV4cCI6MjA0NzI4MTcwM30.I_evbWYpUiKj-RQCcDN1o41TS0Y2VLsV-E9_MSVP0e8';

interface TestResult {
  model: string;
  provider: string;
  question: string;
  answer: string;
  latencyMs: number;
  trustScore?: number;
  error?: string;
}

async function callDirectNavis(question: string, model: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question,
        model,
        cancerType: 'prostate',
        conversationHistory: [],
      }),
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      return {
        model,
        provider: model.startsWith('gemini') ? 'Google' : 'Anthropic',
        question,
        answer: '',
        latencyMs,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      model,
      provider: model.startsWith('gemini') ? 'Google' : 'Anthropic',
      question,
      answer: data.answer || data.response || '',
      latencyMs,
      trustScore: data.trustScore,
    };
  } catch (err: any) {
    return {
      model,
      provider: model.startsWith('gemini') ? 'Google' : 'Anthropic',
      question,
      answer: '',
      latencyMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

async function runComparison() {
  console.log('='.repeat(80));
  console.log('GEMINI vs HAIKU COMPARISON TEST');
  console.log('='.repeat(80));
  console.log();

  const testQuestions = [
    'What are the treatment options for localized prostate cancer?',
    'What biomarkers are important for prostate cancer prognosis?',
    'What is active surveillance for prostate cancer?',
  ];

  const models = ['claude-3-5-haiku', 'gemini-2.5-flash'];

  for (const question of testQuestions) {
    console.log(`\nQuestion: "${question}"`);
    console.log('-'.repeat(80));

    for (const model of models) {
      console.log(`\nTesting ${model}...`);
      const result = await callDirectNavis(question, model);

      if (result.error) {
        console.log(`  ERROR: ${result.error}`);
        console.log(`  Latency: ${result.latencyMs}ms`);
      } else {
        console.log(`  Provider: ${result.provider}`);
        console.log(`  Latency: ${result.latencyMs}ms`);
        console.log(`  Trust Score: ${result.trustScore || 'N/A'}`);
        console.log(`  Answer Preview: ${result.answer.substring(0, 200)}...`);
      }
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

runComparison().catch(console.error);

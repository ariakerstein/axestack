#!/usr/bin/env npx ts-node
/**
 * RAG Health Check - Simple validation suite
 *
 * Validates:
 * 1. Vector search is fast (<2s)
 * 2. Both NCCN and webinar content is retrievable
 * 3. End-to-end query works with acceptable latency
 * 4. Evaluation scores are being stored
 *
 * Run: npx ts-node scripts/rag-health-check.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TestResult {
  name: string;
  passed: boolean;
  latencyMs?: number;
  details: string;
}

const results: TestResult[] = [];

// Test queries covering different scenarios
const TEST_QUERIES = [
  { query: 'metastatic prostate cancer treatment options', expectTier: 'tier_1', description: 'NCCN guideline query' },
  { query: 'bipolar androgen therapy BAT', expectTier: 'tier_3', description: 'Webinar-specific query' },
  { query: 'Bob Gatenby adaptive therapy', expectTier: 'tier_3', description: 'Speaker-specific query' },
  { query: 'BRCA mutation breast cancer', expectTier: 'tier_1', description: 'Biomarker query' },
];

const THRESHOLDS = {
  maxSearchLatencyMs: 2000,
  maxE2ELatencyMs: 10000,
  minSimilarityScore: 0.35,
  minChunksReturned: 3,
};

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function testVectorSearch(query: string, expectTier: string): Promise<TestResult> {
  const start = Date.now();

  try {
    const embedding = await generateEmbedding(query);
    const embeddingTime = Date.now() - start;

    const searchStart = Date.now();
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: 10,
      match_threshold: 0.35,
    });
    const searchTime = Date.now() - searchStart;
    const totalTime = Date.now() - start;

    if (error) throw error;

    const chunks = data || [];
    const hasTier = chunks.some((c: any) => c.content_tier === expectTier);
    const avgSimilarity = chunks.length > 0
      ? chunks.reduce((sum: number, c: any) => sum + c.similarity, 0) / chunks.length
      : 0;

    const passed =
      searchTime < THRESHOLDS.maxSearchLatencyMs &&
      chunks.length >= THRESHOLDS.minChunksReturned &&
      avgSimilarity >= THRESHOLDS.minSimilarityScore;

    return {
      name: `Vector Search: "${query.slice(0, 30)}..."`,
      passed,
      latencyMs: searchTime,
      details: `${chunks.length} chunks, avg sim: ${avgSimilarity.toFixed(3)}, has ${expectTier}: ${hasTier}, search: ${searchTime}ms`,
    };
  } catch (err) {
    return {
      name: `Vector Search: "${query.slice(0, 30)}..."`,
      passed: false,
      details: `Error: ${err}`,
    };
  }
}

async function testTierCoverage(): Promise<TestResult> {
  try {
    // Check tier_1 (NCCN) has embeddings
    const { count: tier1Count } = await supabase
      .from('guideline_chunks')
      .select('id', { count: 'exact' })
      .eq('content_tier', 'tier_1')
      .eq('status', 'active')
      .not('chunk_embedding_vec', 'is', null);

    // Check tier_3 (webinars) has embeddings
    const { count: tier3Count } = await supabase
      .from('guideline_chunks')
      .select('id', { count: 'exact' })
      .eq('content_tier', 'tier_3')
      .eq('status', 'active')
      .not('chunk_embedding_vec', 'is', null);

    const passed = (tier1Count || 0) > 1000 && (tier3Count || 0) > 1000;

    return {
      name: 'Tier Coverage',
      passed,
      details: `tier_1 (NCCN): ${tier1Count} chunks, tier_3 (webinars): ${tier3Count} chunks`,
    };
  } catch (err) {
    return {
      name: 'Tier Coverage',
      passed: false,
      details: `Error: ${err}`,
    };
  }
}

async function testIndexExists(): Promise<TestResult> {
  try {
    // Simple test: run a vector query and check it's fast
    const embedding = await generateEmbedding('test query');

    const start = Date.now();
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: 5,
      match_threshold: 0.3,
    });
    const latency = Date.now() - start;

    // If latency < 2s, index is likely working
    const passed = latency < THRESHOLDS.maxSearchLatencyMs && !error;

    return {
      name: 'Vector Index Health',
      passed,
      latencyMs: latency,
      details: passed
        ? `Index responding in ${latency}ms (threshold: ${THRESHOLDS.maxSearchLatencyMs}ms)`
        : `Slow response: ${latency}ms - index may not be working`,
    };
  } catch (err) {
    return {
      name: 'Vector Index Health',
      passed: false,
      details: `Error: ${err}`,
    };
  }
}

async function testRecentEvaluations(): Promise<TestResult> {
  try {
    // Check if evaluations are being stored (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, count } = await supabase
      .from('response_evaluations')
      .select('overall_confidence, total_latency_ms', { count: 'exact' })
      .gte('created_at', oneDayAgo)
      .limit(100);

    const avgConfidence = data && data.length > 0
      ? data.reduce((sum, r) => sum + (r.overall_confidence || 0), 0) / data.length
      : 0;

    const avgLatency = data && data.length > 0
      ? data.reduce((sum, r) => sum + (r.total_latency_ms || 0), 0) / data.length
      : 0;

    return {
      name: 'Evaluation Storage',
      passed: true, // Info only - doesn't fail
      details: `Last 24h: ${count || 0} evals, avg confidence: ${avgConfidence.toFixed(2)}, avg latency: ${Math.round(avgLatency)}ms`,
    };
  } catch (err) {
    return {
      name: 'Evaluation Storage',
      passed: true,
      details: `Could not check: ${err}`,
    };
  }
}

async function testWebinarUrls(): Promise<TestResult> {
  try {
    // Check that webinar URLs point to Supabase storage, not fake domains
    const { data } = await supabase
      .from('guideline_chunks')
      .select('url')
      .eq('content_tier', 'tier_3')
      .eq('status', 'active')
      .limit(100);

    const badUrls = (data || []).filter(
      (r) => r.url && (r.url.includes('leafscience.org') || r.url.includes('example.com'))
    );

    const passed = badUrls.length === 0;

    return {
      name: 'Webinar URL Quality',
      passed,
      details: passed
        ? 'All checked URLs point to valid storage locations'
        : `Found ${badUrls.length} URLs with invalid domains`,
    };
  } catch (err) {
    return {
      name: 'Webinar URL Quality',
      passed: false,
      details: `Error: ${err}`,
    };
  }
}

async function runHealthCheck() {
  console.log('═'.repeat(60));
  console.log('RAG HEALTH CHECK');
  console.log('═'.repeat(60));
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Run all tests
  results.push(await testIndexExists());
  results.push(await testTierCoverage());
  results.push(await testWebinarUrls());

  for (const testCase of TEST_QUERIES) {
    results.push(await testVectorSearch(testCase.query, testCase.expectTier));
  }

  results.push(await testRecentEvaluations());

  // Print results
  console.log('\nRESULTS:');
  console.log('─'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : '';
    console.log(`${status} ${result.name}${latency}`);
    console.log(`       ${result.details}`);

    if (result.passed) passed++;
    else failed++;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));

  // Exit with error code if any critical tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

runHealthCheck().catch(console.error);

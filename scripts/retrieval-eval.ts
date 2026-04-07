#!/usr/bin/env tsx
/**
 * Retrieval Quality Evaluation Framework
 *
 * PURPOSE: Systematically measure whether our semantic search finds the RIGHT content.
 * This tests the RETRIEVAL step, not the LLM generation step.
 *
 * METRICS:
 * - Recall@K: Did we retrieve the expected chunks in top K results?
 * - Precision: What % of retrieved chunks are relevant?
 * - MRR (Mean Reciprocal Rank): How high did the best match rank?
 * - Latency: How fast was the search?
 * - Coverage: Did we get content from expected tiers/sources?
 *
 * Usage:
 *   npx tsx scripts/retrieval-eval.ts                    # Run all tests
 *   npx tsx scripts/retrieval-eval.ts --test breast      # Run specific test
 *   npx tsx scripts/retrieval-eval.ts --compare          # Compare old vs new approach
 *   npx tsx scripts/retrieval-eval.ts --save             # Save results to database
 */

import { createClient } from '@supabase/supabase-js';

// ==================== CONFIGURATION ====================

const SUPABASE_URL = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ';

// ==================== TYPES ====================

interface RetrievalTestCase {
  id: string;
  name: string;
  question: string;
  cancerType: string;

  // Expected retrieval outcomes
  expectedSources: {
    mustInclude: string[];      // Titles/sources that MUST be in top results
    shouldInclude: string[];    // Titles/sources that SHOULD appear (nice to have)
    mustNotInclude: string[];   // Titles/sources that should NOT appear (wrong cancer type, etc.)
  };

  expectedTiers: {
    tier_1?: { min: number; max: number };  // Expected NCCN chunk count
    tier_2?: { min: number; max: number };  // Expected journal chunk count
    tier_3?: { min: number; max: number };  // Expected webinar chunk count
  };

  // Keywords that should appear in chunk text
  expectedKeywords: string[];

  // Performance expectations
  maxLatencyMs: number;
  minChunks: number;
  maxChunks: number;
}

interface RetrievalResult {
  testId: string;
  testName: string;
  question: string;
  cancerType: string;

  // Actual results
  totalChunks: number;
  latencyMs: number;
  searchMethod: string;

  // Tier breakdown
  tierBreakdown: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
  };

  // Retrieved chunks (top 10)
  topChunks: Array<{
    title: string;
    source: string;
    tier: string;
    similarity: number;
    cancerType: string;
    textPreview: string;
  }>;

  // Scores
  scores: {
    recall: number;           // % of mustInclude found
    precision: number;        // % of retrieved that are relevant
    mrr: number;              // Mean reciprocal rank of first mustInclude
    keywordCoverage: number;  // % of expected keywords found
    tierMatch: number;        // Did tier distribution match expectations?
    latencyScore: number;     // 1.0 if under max, scales down
  };

  // Overall
  overallScore: number;       // Weighted average of scores
  passed: boolean;
  issues: string[];           // List of problems detected
}

// ==================== TEST CASES ====================

const RETRIEVAL_TEST_CASES: RetrievalTestCase[] = [
  {
    id: 'breast-biomarkers',
    name: 'Breast Cancer Biomarker Tests',
    question: 'Which biomarker tests (ER/PR, HER2) are recommended for breast cancer?',
    cancerType: 'Breast - Metastatic',
    expectedSources: {
      mustInclude: ['Breast', 'NCCN'],           // Must find breast NCCN content
      shouldInclude: ['HER2', 'hormone receptor', 'biomarker'],
      mustNotInclude: ['Prostate', 'Lung Cancer']  // Should NOT get other cancer types
    },
    expectedTiers: {
      tier_1: { min: 1, max: 20 },  // At least 1 NCCN chunk
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 0, max: 10 }
    },
    expectedKeywords: ['HER2', 'estrogen', 'progesterone', 'hormone receptor', 'ER', 'PR'],
    maxLatencyMs: 3000,
    minChunks: 3,
    maxChunks: 30
  },
  {
    id: 'prostate-gleason',
    name: 'Prostate Cancer Gleason Score',
    question: 'What is a Gleason score and how does it affect treatment?',
    cancerType: 'Prostate',
    expectedSources: {
      mustInclude: ['Prostate', 'NCCN'],
      shouldInclude: ['Gleason', 'grade', 'biopsy'],
      mustNotInclude: ['Breast', 'Lung']
    },
    expectedTiers: {
      tier_1: { min: 1, max: 20 },
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 0, max: 10 }
    },
    expectedKeywords: ['Gleason', 'grade', 'score', 'biopsy', 'pathology'],
    maxLatencyMs: 3000,
    minChunks: 3,
    maxChunks: 30
  },
  {
    id: 'prostate-bat',
    name: 'Bipolar Androgen Therapy (Webinar Content)',
    question: 'What is Bipolar Androgen Therapy and how does it work?',
    cancerType: 'Prostate',
    expectedSources: {
      mustInclude: ['Bipolar Androgen', 'BAT'],
      shouldInclude: ['webinar', 'testosterone'],
      mustNotInclude: ['Breast']
    },
    expectedTiers: {
      tier_1: { min: 0, max: 15 },
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 1, max: 20 }   // Should find webinar content
    },
    expectedKeywords: ['bipolar', 'androgen', 'testosterone', 'BAT', 'hormone'],
    maxLatencyMs: 3000,
    minChunks: 3,
    maxChunks: 30
  },
  {
    id: 'lung-biomarkers',
    name: 'Lung Cancer Molecular Testing',
    question: 'Which molecular biomarkers should be tested for non-small cell lung cancer?',
    cancerType: 'Lung - Metastatic',
    expectedSources: {
      mustInclude: ['Lung', 'NCCN'],
      shouldInclude: ['EGFR', 'ALK', 'ROS1', 'PD-L1'],
      mustNotInclude: ['Breast', 'Prostate']
    },
    expectedTiers: {
      tier_1: { min: 1, max: 20 },
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 0, max: 10 }
    },
    expectedKeywords: ['EGFR', 'ALK', 'ROS1', 'BRAF', 'PD-L1', 'mutation', 'molecular'],
    maxLatencyMs: 3000,
    minChunks: 3,
    maxChunks: 30
  },
  {
    id: 'general-clinical-trials',
    name: 'Clinical Trials (Cross-Cancer)',
    question: 'How do I find clinical trials for my cancer?',
    cancerType: 'Breast - Metastatic',
    expectedSources: {
      mustInclude: ['clinical trial'],
      shouldInclude: ['enrollment', 'eligibility', 'trial'],
      mustNotInclude: []  // Cross-cancer content is OK here
    },
    expectedTiers: {
      tier_1: { min: 0, max: 15 },
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 0, max: 20 }   // Webinars often cover clinical trials
    },
    expectedKeywords: ['clinical trial', 'enroll', 'eligib', 'study'],
    maxLatencyMs: 3000,
    minChunks: 2,
    maxChunks: 30
  },
  {
    id: 'breast-metastatic-treatment',
    name: 'Metastatic Breast Cancer Treatment',
    question: 'What are the treatment options for metastatic breast cancer?',
    cancerType: 'Breast - Metastatic',
    expectedSources: {
      mustInclude: ['Breast', 'Metastatic'],
      shouldInclude: ['treatment', 'therapy', 'NCCN'],
      mustNotInclude: ['Prostate', 'Early-Stage Prostate']
    },
    expectedTiers: {
      tier_1: { min: 2, max: 20 },  // Should get substantial NCCN content
      tier_2: { min: 0, max: 10 },
      tier_3: { min: 0, max: 10 }
    },
    expectedKeywords: ['metastatic', 'treatment', 'therapy', 'chemotherapy', 'hormone'],
    maxLatencyMs: 3000,
    minChunks: 5,
    maxChunks: 30
  }
];

// ==================== EVALUATION LOGIC ====================

async function runRetrievalTest(testCase: RetrievalTestCase, approach: 'current' | 'experimental' = 'current'): Promise<RetrievalResult> {
  const startTime = Date.now();
  const issues: string[] = [];

  // Call the direct-navis function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/direct-navis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      question: testCase.question,
      cancerType: testCase.cancerType,
      model: 'claude-3-5-haiku',
      conversationHistory: [],
      // Pass experimental flag if testing new approach
      experimentalSearch: approach === 'experimental'
    }),
  });

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  // Extract chunk info from response
  const debug = data.debug || {};
  let chunks = data.retrievedChunks || debug.retrievedChunks || [];

  // If no chunks but we have citations, use citations as fallback for scoring
  const citations = data.citations || [];
  const citationUrls = data.citationUrls || {};
  const chunksUsed = data.chunksUsed || chunks.length;

  // Calculate tier breakdown
  const tierBreakdown = {
    tier_1: chunks.filter((c: any) => c.content_tier === 'tier_1').length,
    tier_2: chunks.filter((c: any) => c.content_tier === 'tier_2').length,
    tier_3: chunks.filter((c: any) => c.content_tier === 'tier_3').length,
  };

  // Get top chunks for analysis (handle both raw chunks and citation format)
  const topChunks = chunks.slice(0, 10).map((c: any) => ({
    title: c.guideline_title || c.title || 'Unknown',
    source: c.guideline_source || c.source || 'Unknown',
    tier: c.content_tier || c.tier || 'Unknown',
    similarity: c.similarity || 0,
    cancerType: c.cancer_type || c.cancerType || 'Unknown',
    textPreview: (c.chunk_text || c.text || c.content || '').substring(0, 150)
  }));

  // ===== CALCULATE SCORES =====

  // 1. Recall: Did we find the mustInclude sources?
  // Check in chunks, citations, and answer
  const allSearchableText = [
    ...topChunks.map((c: any) => `${c.title} ${c.source} ${c.textPreview} ${c.cancerType}`.toLowerCase()),
    ...citations.map((c: string) => c.toLowerCase()),
    (data.answer || '').toLowerCase()
  ].join(' ');

  const foundMustInclude = testCase.expectedSources.mustInclude.filter(expected => {
    const lowerExpected = expected.toLowerCase();
    return allSearchableText.includes(lowerExpected);
  });
  const recall = testCase.expectedSources.mustInclude.length > 0
    ? foundMustInclude.length / testCase.expectedSources.mustInclude.length
    : 1.0;

  if (recall < 1.0) {
    const missing = testCase.expectedSources.mustInclude.filter(e => !foundMustInclude.includes(e));
    issues.push(`Missing required sources: ${missing.join(', ')}`);
  }

  // 2. Precision: Did we avoid mustNotInclude sources?
  const foundMustNotInclude = testCase.expectedSources.mustNotInclude.filter(excluded => {
    const lowerExcluded = excluded.toLowerCase();
    return topChunks.some((chunk: any) =>
      chunk.title.toLowerCase().includes(lowerExcluded) ||
      chunk.cancerType.toLowerCase().includes(lowerExcluded)
    );
  });
  const precision = testCase.expectedSources.mustNotInclude.length > 0
    ? 1.0 - (foundMustNotInclude.length / testCase.expectedSources.mustNotInclude.length)
    : 1.0;

  if (precision < 1.0) {
    issues.push(`Found excluded sources: ${foundMustNotInclude.join(', ')}`);
  }

  // 3. MRR: Mean Reciprocal Rank of first mustInclude match
  let mrr = 0;
  for (let i = 0; i < topChunks.length; i++) {
    const chunk = topChunks[i];
    const isMatch = testCase.expectedSources.mustInclude.some(expected => {
      const lowerExpected = expected.toLowerCase();
      return chunk.title.toLowerCase().includes(lowerExpected) ||
             chunk.source.toLowerCase().includes(lowerExpected) ||
             chunk.textPreview.toLowerCase().includes(lowerExpected);
    });
    if (isMatch) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  if (mrr === 0 && testCase.expectedSources.mustInclude.length > 0) {
    issues.push('No mustInclude sources found in top 10 results');
  }

  // 4. Keyword Coverage - check answer + chunks
  const allTextForKeywords = allSearchableText;
  const foundKeywords = testCase.expectedKeywords.filter(kw =>
    allTextForKeywords.includes(kw.toLowerCase())
  );
  const keywordCoverage = testCase.expectedKeywords.length > 0
    ? foundKeywords.length / testCase.expectedKeywords.length
    : 1.0;

  if (keywordCoverage < 0.5) {
    issues.push(`Low keyword coverage (${(keywordCoverage * 100).toFixed(0)}%): missing ${testCase.expectedKeywords.filter(k => !foundKeywords.includes(k)).join(', ')}`);
  }

  // 5. Tier Match Score
  let tierMatch = 1.0;
  if (testCase.expectedTiers.tier_1) {
    if (tierBreakdown.tier_1 < testCase.expectedTiers.tier_1.min) {
      tierMatch -= 0.3;
      issues.push(`Too few tier_1 chunks: ${tierBreakdown.tier_1} (expected >= ${testCase.expectedTiers.tier_1.min})`);
    }
  }
  if (testCase.expectedTiers.tier_3 && testCase.expectedTiers.tier_3.min > 0) {
    if (tierBreakdown.tier_3 < testCase.expectedTiers.tier_3.min) {
      tierMatch -= 0.3;
      issues.push(`Too few tier_3 chunks: ${tierBreakdown.tier_3} (expected >= ${testCase.expectedTiers.tier_3.min})`);
    }
  }
  tierMatch = Math.max(0, tierMatch);

  // 6. Latency Score
  const latencyScore = latencyMs <= testCase.maxLatencyMs
    ? 1.0
    : Math.max(0, 1.0 - ((latencyMs - testCase.maxLatencyMs) / testCase.maxLatencyMs));

  if (latencyMs > testCase.maxLatencyMs) {
    issues.push(`Latency too high: ${latencyMs}ms (max ${testCase.maxLatencyMs}ms)`);
  }

  // 7. Chunk count validation
  if (chunks.length < testCase.minChunks) {
    issues.push(`Too few chunks: ${chunks.length} (min ${testCase.minChunks})`);
  }

  // ===== OVERALL SCORE =====
  // Weights: recall=30%, precision=20%, mrr=15%, keywords=15%, tiers=10%, latency=10%
  const overallScore = (
    recall * 0.30 +
    precision * 0.20 +
    mrr * 0.15 +
    keywordCoverage * 0.15 +
    tierMatch * 0.10 +
    latencyScore * 0.10
  );

  // Pass if overall >= 0.7 and no critical issues (recall >= 0.5)
  const passed = overallScore >= 0.7 && recall >= 0.5;

  return {
    testId: testCase.id,
    testName: testCase.name,
    question: testCase.question,
    cancerType: testCase.cancerType,
    totalChunks: chunksUsed || chunks.length,
    latencyMs: data.totalLatencyMs || latencyMs,
    searchMethod: data.searchMethod || 'unknown',
    tierBreakdown,
    topChunks,
    scores: {
      recall,
      precision,
      mrr,
      keywordCoverage,
      tierMatch,
      latencyScore
    },
    overallScore,
    passed,
    issues
  };
}

// ==================== REPORTING ====================

function printResult(result: RetrievalResult): void {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${result.testId}] ${result.testName} - ${status}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Question: "${result.question}"`);
  console.log(`Cancer Type: ${result.cancerType}`);
  console.log(`Search Method: ${result.searchMethod}`);
  console.log(`\nMETRICS:`);
  console.log(`  Chunks Retrieved: ${result.totalChunks}`);
  console.log(`  Latency: ${result.latencyMs}ms`);
  console.log(`  Tier Breakdown: NCCN=${result.tierBreakdown.tier_1}, Journals=${result.tierBreakdown.tier_2}, Webinars=${result.tierBreakdown.tier_3}`);

  console.log(`\nSCORES:`);
  console.log(`  Recall (mustInclude found): ${(result.scores.recall * 100).toFixed(0)}%`);
  console.log(`  Precision (excluded avoided): ${(result.scores.precision * 100).toFixed(0)}%`);
  console.log(`  MRR (ranking quality): ${result.scores.mrr.toFixed(2)}`);
  console.log(`  Keyword Coverage: ${(result.scores.keywordCoverage * 100).toFixed(0)}%`);
  console.log(`  Tier Match: ${(result.scores.tierMatch * 100).toFixed(0)}%`);
  console.log(`  Latency Score: ${(result.scores.latencyScore * 100).toFixed(0)}%`);
  console.log(`  ─────────────────────`);
  console.log(`  OVERALL: ${(result.overallScore * 100).toFixed(0)}%`);

  if (result.issues.length > 0) {
    console.log(`\n⚠️  ISSUES:`);
    result.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(`\nTOP 5 CHUNKS:`);
  result.topChunks.slice(0, 5).forEach((chunk, i) => {
    console.log(`  ${i + 1}. [${chunk.tier}] ${chunk.title.substring(0, 50)}...`);
    console.log(`     Similarity: ${chunk.similarity.toFixed(3)}, Cancer: ${chunk.cancerType}`);
  });
}

function printSummary(results: RetrievalResult[]): void {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / total;
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / total;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`RETRIEVAL EVALUATION SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Tests Passed: ${passed}/${total} (${((passed/total)*100).toFixed(0)}%)`);
  console.log(`Average Score: ${(avgScore * 100).toFixed(0)}%`);
  console.log(`Average Latency: ${avgLatency.toFixed(0)}ms`);

  console.log(`\nPER-METRIC AVERAGES:`);
  const avgRecall = results.reduce((sum, r) => sum + r.scores.recall, 0) / total;
  const avgPrecision = results.reduce((sum, r) => sum + r.scores.precision, 0) / total;
  const avgMRR = results.reduce((sum, r) => sum + r.scores.mrr, 0) / total;
  const avgKeywords = results.reduce((sum, r) => sum + r.scores.keywordCoverage, 0) / total;

  console.log(`  Recall: ${(avgRecall * 100).toFixed(0)}%`);
  console.log(`  Precision: ${(avgPrecision * 100).toFixed(0)}%`);
  console.log(`  MRR: ${avgMRR.toFixed(2)}`);
  console.log(`  Keyword Coverage: ${(avgKeywords * 100).toFixed(0)}%`);

  // Show failing tests
  const failing = results.filter(r => !r.passed);
  if (failing.length > 0) {
    console.log(`\n❌ FAILING TESTS:`);
    failing.forEach(r => {
      console.log(`  [${r.testId}] ${r.testName}: ${(r.overallScore * 100).toFixed(0)}%`);
      r.issues.slice(0, 2).forEach(issue => console.log(`    - ${issue}`));
    });
  }

  // Recommendations
  console.log(`\nRECOMMENDATIONS:`);
  if (avgRecall < 0.7) {
    console.log(`  ⚠️  Low recall - consider loosening cancer_type pre-filtering`);
  }
  if (avgPrecision < 0.8) {
    console.log(`  ⚠️  Low precision - consider tighter cancer_type matching`);
  }
  if (avgLatency > 2500) {
    console.log(`  ⚠️  High latency - consider search optimizations`);
  }
  if (avgMRR < 0.5) {
    console.log(`  ⚠️  Low MRR - relevant results not ranking high enough`);
  }
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const testId = args.find(a => a.startsWith('--test='))?.split('=')[1];
  const compareMode = args.includes('--compare');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`RETRIEVAL QUALITY EVALUATION`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}`);

  const testsToRun = testId
    ? RETRIEVAL_TEST_CASES.filter(t => t.id === testId || t.id.includes(testId))
    : RETRIEVAL_TEST_CASES;

  if (testsToRun.length === 0) {
    console.error(`No tests found matching: ${testId}`);
    console.log(`Available tests: ${RETRIEVAL_TEST_CASES.map(t => t.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`Running ${testsToRun.length} test(s)...`);

  const results: RetrievalResult[] = [];

  for (const testCase of testsToRun) {
    try {
      const result = await runRetrievalTest(testCase, 'current');
      results.push(result);
      printResult(result);
    } catch (err) {
      console.error(`\n❌ Error running test ${testCase.id}:`, err);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (results.length > 1) {
    printSummary(results);
  }

  // Exit with error code if any tests failed
  const failedCount = results.filter(r => !r.passed).length;
  if (failedCount > 0) {
    console.log(`\n${failedCount} test(s) failed.`);
    process.exit(1);
  }

  console.log(`\n✅ All tests passed!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

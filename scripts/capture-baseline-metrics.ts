#!/usr/bin/env tsx
/**
 * Baseline Metrics Capture Tool
 *
 * Captures a snapshot of current RAG system performance for comparison before/after changes.
 * Run this BEFORE making changes to establish baseline, then run again AFTER to compare.
 *
 * Usage:
 *   npx tsx scripts/capture-baseline-metrics.ts                    # Capture new baseline
 *   npx tsx scripts/capture-baseline-metrics.ts --compare baseline_20251214.json  # Compare to baseline
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ==================== TYPES ====================

interface BaselineMetrics {
  capturedAt: string;
  version: string;
  period: {
    start: string;
    end: string;
    daysAnalyzed: number;
  };
  summary: {
    totalEvaluations: number;
    avgOverallConfidence: number;
    avgAccuracy: number;
    avgCompleteness: number;
    avgSourceSupport: number;
  };
  latency: {
    avgTotalMs: number;
    avgSearchMs: number;
    avgLlmMs: number;
    avgEvalMs: number;
    p50TotalMs: number;
    p95TotalMs: number;
    p99TotalMs: number;
  };
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
    highPercent: number;
    mediumPercent: number;
    lowPercent: number;
  };
  byModel: Record<string, {
    count: number;
    avgConfidence: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  }>;
  byCancerType: Record<string, {
    count: number;
    avgConfidence: number;
    avgLatencyMs: number;
  }>;
  qualityGates: {
    avgConfidenceAbove7: boolean;
    p95LatencyBelow10s: boolean;
    highConfidenceAbove50Percent: boolean;
    lowConfidenceBelow10Percent: boolean;
  };
}

// ==================== SUPABASE CLIENT ====================

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== HELPER FUNCTIONS ====================

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function normalizeModelName(model: string): string {
  if (!model) return 'unknown';
  const lower = model.toLowerCase();
  if (lower.includes('sonnet')) return 'claude-3.5-sonnet';
  if (lower.includes('opus')) return 'claude-3-opus';
  if (lower.includes('haiku')) return 'claude-3-haiku';
  if (lower.includes('gemini')) return 'gemini';
  return model;
}

// ==================== CAPTURE BASELINE ====================

async function captureBaseline(daysBack: number = 30): Promise<BaselineMetrics> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  console.log(`\n📊 Capturing baseline metrics from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`   Period: ${daysBack} days\n`);

  // Fetch evaluations
  const { data: evaluations, error } = await supabase
    .from('response_evaluations')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('❌ Error fetching evaluations:', error);
    process.exit(1);
  }

  if (!evaluations || evaluations.length === 0) {
    console.error('❌ No evaluations found in the specified period');
    process.exit(1);
  }

  console.log(`✅ Found ${evaluations.length} evaluations\n`);

  // Calculate metrics
  const totalLatencies = evaluations
    .map(e => e.total_latency_ms)
    .filter((v): v is number => v != null);

  const searchLatencies = evaluations
    .map(e => e.search_latency_ms)
    .filter((v): v is number => v != null);

  const llmLatencies = evaluations
    .map(e => e.llm_latency_ms)
    .filter((v): v is number => v != null);

  const evalLatencies = evaluations
    .map(e => e.evaluation_latency_ms)
    .filter((v): v is number => v != null);

  // Confidence distribution
  const highConfidence = evaluations.filter(e => (e.overall_confidence || 0) >= 8.0);
  const mediumConfidence = evaluations.filter(e => (e.overall_confidence || 0) >= 6.0 && (e.overall_confidence || 0) < 8.0);
  const lowConfidence = evaluations.filter(e => (e.overall_confidence || 0) < 6.0);

  // By model
  const byModel: Record<string, { evals: any[] }> = {};
  for (const ev of evaluations) {
    const model = normalizeModelName(ev.model_used);
    if (!byModel[model]) byModel[model] = { evals: [] };
    byModel[model].evals.push(ev);
  }

  const byModelMetrics: BaselineMetrics['byModel'] = {};
  for (const [model, data] of Object.entries(byModel)) {
    const latencies = data.evals
      .map(e => e.total_latency_ms)
      .filter((v): v is number => v != null);

    byModelMetrics[model] = {
      count: data.evals.length,
      avgConfidence: data.evals.reduce((sum, e) => sum + (e.overall_confidence || 0), 0) / data.evals.length,
      avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95LatencyMs: calculatePercentile(latencies, 95)
    };
  }

  // By cancer type
  const byCancerType: Record<string, { evals: any[] }> = {};
  for (const ev of evaluations) {
    const cancer = ev.cancer_type || 'general';
    if (!byCancerType[cancer]) byCancerType[cancer] = { evals: [] };
    byCancerType[cancer].evals.push(ev);
  }

  const byCancerTypeMetrics: BaselineMetrics['byCancerType'] = {};
  for (const [cancer, data] of Object.entries(byCancerType)) {
    const latencies = data.evals
      .map(e => e.total_latency_ms)
      .filter((v): v is number => v != null);

    byCancerTypeMetrics[cancer] = {
      count: data.evals.length,
      avgConfidence: data.evals.reduce((sum, e) => sum + (e.overall_confidence || 0), 0) / data.evals.length,
      avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    };
  }

  // Calculate averages
  const avgOverallConfidence = evaluations.reduce((sum, e) => sum + (e.overall_confidence || 0), 0) / evaluations.length;
  const avgAccuracy = evaluations.reduce((sum, e) => sum + (e.accuracy_score || 0), 0) / evaluations.length;
  const avgCompleteness = evaluations.reduce((sum, e) => sum + (e.completeness_score || 0), 0) / evaluations.length;
  const avgSourceSupport = evaluations.reduce((sum, e) => sum + (e.source_support_score || 0), 0) / evaluations.length;

  const avgTotalMs = totalLatencies.length > 0 ? totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length : 0;
  const avgSearchMs = searchLatencies.length > 0 ? searchLatencies.reduce((a, b) => a + b, 0) / searchLatencies.length : 0;
  const avgLlmMs = llmLatencies.length > 0 ? llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length : 0;
  const avgEvalMs = evalLatencies.length > 0 ? evalLatencies.reduce((a, b) => a + b, 0) / evalLatencies.length : 0;

  const baseline: BaselineMetrics = {
    capturedAt: new Date().toISOString(),
    version: '1.0',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      daysAnalyzed: daysBack
    },
    summary: {
      totalEvaluations: evaluations.length,
      avgOverallConfidence,
      avgAccuracy,
      avgCompleteness,
      avgSourceSupport
    },
    latency: {
      avgTotalMs,
      avgSearchMs,
      avgLlmMs,
      avgEvalMs,
      p50TotalMs: calculatePercentile(totalLatencies, 50),
      p95TotalMs: calculatePercentile(totalLatencies, 95),
      p99TotalMs: calculatePercentile(totalLatencies, 99)
    },
    confidenceDistribution: {
      high: highConfidence.length,
      medium: mediumConfidence.length,
      low: lowConfidence.length,
      highPercent: (highConfidence.length / evaluations.length) * 100,
      mediumPercent: (mediumConfidence.length / evaluations.length) * 100,
      lowPercent: (lowConfidence.length / evaluations.length) * 100
    },
    byModel: byModelMetrics,
    byCancerType: byCancerTypeMetrics,
    qualityGates: {
      avgConfidenceAbove7: avgOverallConfidence >= 7.0,
      p95LatencyBelow10s: calculatePercentile(totalLatencies, 95) < 10000,
      highConfidenceAbove50Percent: (highConfidence.length / evaluations.length) >= 0.5,
      lowConfidenceBelow10Percent: (lowConfidence.length / evaluations.length) <= 0.1
    }
  };

  return baseline;
}

// ==================== PRINT BASELINE ====================

function printBaseline(baseline: BaselineMetrics): void {
  console.log('\n' + '='.repeat(80));
  console.log('BASELINE METRICS REPORT');
  console.log('='.repeat(80) + '\n');

  console.log(`Captured: ${baseline.capturedAt}`);
  console.log(`Period: ${baseline.period.start.split('T')[0]} to ${baseline.period.end.split('T')[0]} (${baseline.period.daysAnalyzed} days)\n`);

  console.log('SUMMARY');
  console.log('-'.repeat(40));
  console.log(`  Total Evaluations:     ${baseline.summary.totalEvaluations}`);
  console.log(`  Avg Confidence:        ${baseline.summary.avgOverallConfidence.toFixed(2)}/10`);
  console.log(`  Avg Accuracy:          ${baseline.summary.avgAccuracy.toFixed(2)}/10`);
  console.log(`  Avg Completeness:      ${baseline.summary.avgCompleteness.toFixed(2)}/10`);
  console.log(`  Avg Source Support:    ${baseline.summary.avgSourceSupport.toFixed(2)}/10\n`);

  console.log('LATENCY');
  console.log('-'.repeat(40));
  console.log(`  Avg Total:             ${(baseline.latency.avgTotalMs / 1000).toFixed(2)}s`);
  console.log(`  Avg Search:            ${(baseline.latency.avgSearchMs / 1000).toFixed(2)}s`);
  console.log(`  Avg LLM:               ${(baseline.latency.avgLlmMs / 1000).toFixed(2)}s`);
  console.log(`  P50 Total:             ${(baseline.latency.p50TotalMs / 1000).toFixed(2)}s`);
  console.log(`  P95 Total:             ${(baseline.latency.p95TotalMs / 1000).toFixed(2)}s`);
  console.log(`  P99 Total:             ${(baseline.latency.p99TotalMs / 1000).toFixed(2)}s\n`);

  console.log('CONFIDENCE DISTRIBUTION');
  console.log('-'.repeat(40));
  console.log(`  High (≥8.0):           ${baseline.confidenceDistribution.high} (${baseline.confidenceDistribution.highPercent.toFixed(1)}%)`);
  console.log(`  Medium (6.0-7.9):      ${baseline.confidenceDistribution.medium} (${baseline.confidenceDistribution.mediumPercent.toFixed(1)}%)`);
  console.log(`  Low (<6.0):            ${baseline.confidenceDistribution.low} (${baseline.confidenceDistribution.lowPercent.toFixed(1)}%)\n`);

  console.log('BY MODEL');
  console.log('-'.repeat(40));
  for (const [model, metrics] of Object.entries(baseline.byModel)) {
    console.log(`  ${model}:`);
    console.log(`    Count: ${metrics.count}, Confidence: ${metrics.avgConfidence.toFixed(2)}, Latency: ${(metrics.avgLatencyMs / 1000).toFixed(2)}s (P95: ${(metrics.p95LatencyMs / 1000).toFixed(2)}s)`);
  }
  console.log();

  console.log('BY CANCER TYPE (top 5)');
  console.log('-'.repeat(40));
  const sortedCancerTypes = Object.entries(baseline.byCancerType)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  for (const [cancer, metrics] of sortedCancerTypes) {
    console.log(`  ${cancer}: ${metrics.count} evals, confidence: ${metrics.avgConfidence.toFixed(2)}`);
  }
  console.log();

  console.log('QUALITY GATES');
  console.log('-'.repeat(40));
  const gates = baseline.qualityGates;
  console.log(`  ${gates.avgConfidenceAbove7 ? '✅' : '❌'} Avg confidence ≥ 7.0`);
  console.log(`  ${gates.p95LatencyBelow10s ? '✅' : '❌'} P95 latency < 10s`);
  console.log(`  ${gates.highConfidenceAbove50Percent ? '✅' : '❌'} High confidence ≥ 50%`);
  console.log(`  ${gates.lowConfidenceBelow10Percent ? '✅' : '❌'} Low confidence ≤ 10%`);
  console.log();
}

// ==================== COMPARE BASELINES ====================

function compareBaselines(before: BaselineMetrics, after: BaselineMetrics): void {
  console.log('\n' + '='.repeat(80));
  console.log('BASELINE COMPARISON');
  console.log('='.repeat(80) + '\n');

  console.log(`Before: ${before.capturedAt.split('T')[0]} (${before.summary.totalEvaluations} evals)`);
  console.log(`After:  ${after.capturedAt.split('T')[0]} (${after.summary.totalEvaluations} evals)\n`);

  const delta = (after: number, before: number, inverted = false) => {
    const diff = after - before;
    const pct = before !== 0 ? ((diff / before) * 100).toFixed(1) : '∞';
    const sign = diff >= 0 ? '+' : '';
    const color = (inverted ? diff <= 0 : diff >= 0) ? '✅' : '⚠️';
    return `${color} ${sign}${diff.toFixed(2)} (${sign}${pct}%)`;
  };

  console.log('QUALITY CHANGES');
  console.log('-'.repeat(60));
  console.log(`  Avg Confidence:     ${before.summary.avgOverallConfidence.toFixed(2)} → ${after.summary.avgOverallConfidence.toFixed(2)}  ${delta(after.summary.avgOverallConfidence, before.summary.avgOverallConfidence)}`);
  console.log(`  Avg Accuracy:       ${before.summary.avgAccuracy.toFixed(2)} → ${after.summary.avgAccuracy.toFixed(2)}  ${delta(after.summary.avgAccuracy, before.summary.avgAccuracy)}`);
  console.log(`  High Confidence %:  ${before.confidenceDistribution.highPercent.toFixed(1)}% → ${after.confidenceDistribution.highPercent.toFixed(1)}%  ${delta(after.confidenceDistribution.highPercent, before.confidenceDistribution.highPercent)}`);
  console.log(`  Low Confidence %:   ${before.confidenceDistribution.lowPercent.toFixed(1)}% → ${after.confidenceDistribution.lowPercent.toFixed(1)}%  ${delta(after.confidenceDistribution.lowPercent, before.confidenceDistribution.lowPercent, true)}\n`);

  console.log('LATENCY CHANGES');
  console.log('-'.repeat(60));
  console.log(`  Avg Total:          ${(before.latency.avgTotalMs / 1000).toFixed(2)}s → ${(after.latency.avgTotalMs / 1000).toFixed(2)}s  ${delta(after.latency.avgTotalMs, before.latency.avgTotalMs, true)}`);
  console.log(`  P95 Total:          ${(before.latency.p95TotalMs / 1000).toFixed(2)}s → ${(after.latency.p95TotalMs / 1000).toFixed(2)}s  ${delta(after.latency.p95TotalMs, before.latency.p95TotalMs, true)}`);
  console.log(`  Avg Search:         ${(before.latency.avgSearchMs / 1000).toFixed(2)}s → ${(after.latency.avgSearchMs / 1000).toFixed(2)}s  ${delta(after.latency.avgSearchMs, before.latency.avgSearchMs, true)}`);
  console.log(`  Avg LLM:            ${(before.latency.avgLlmMs / 1000).toFixed(2)}s → ${(after.latency.avgLlmMs / 1000).toFixed(2)}s  ${delta(after.latency.avgLlmMs, before.latency.avgLlmMs, true)}\n`);

  // Regression check
  console.log('REGRESSION CHECK');
  console.log('-'.repeat(60));

  const regressions: string[] = [];

  if (after.summary.avgOverallConfidence < before.summary.avgOverallConfidence - 0.5) {
    regressions.push(`Confidence dropped by ${(before.summary.avgOverallConfidence - after.summary.avgOverallConfidence).toFixed(2)} points`);
  }

  if (after.latency.p95TotalMs > before.latency.p95TotalMs * 1.1) {
    regressions.push(`P95 latency increased by ${((after.latency.p95TotalMs / before.latency.p95TotalMs - 1) * 100).toFixed(1)}%`);
  }

  if (after.confidenceDistribution.lowPercent > before.confidenceDistribution.lowPercent + 5) {
    regressions.push(`Low confidence responses increased from ${before.confidenceDistribution.lowPercent.toFixed(1)}% to ${after.confidenceDistribution.lowPercent.toFixed(1)}%`);
  }

  if (regressions.length === 0) {
    console.log('  ✅ No regressions detected!');
  } else {
    console.log('  ⚠️  REGRESSIONS DETECTED:');
    for (const r of regressions) {
      console.log(`     - ${r}`);
    }
  }
  console.log();
}

// ==================== CHECK FOR REGRESSIONS (CI MODE) ====================

interface RegressionResult {
  hasRegressions: boolean;
  regressions: string[];
  improvements: string[];
}

function checkRegressions(before: BaselineMetrics, after: BaselineMetrics): RegressionResult {
  const regressions: string[] = [];
  const improvements: string[] = [];

  // Quality checks
  const confidenceDelta = after.summary.avgOverallConfidence - before.summary.avgOverallConfidence;
  if (confidenceDelta < -0.5) {
    regressions.push(`Confidence dropped by ${Math.abs(confidenceDelta).toFixed(2)} points (${before.summary.avgOverallConfidence.toFixed(2)} → ${after.summary.avgOverallConfidence.toFixed(2)})`);
  } else if (confidenceDelta > 0.3) {
    improvements.push(`Confidence improved by ${confidenceDelta.toFixed(2)} points`);
  }

  // Latency checks
  const latencyRatio = after.latency.p95TotalMs / before.latency.p95TotalMs;
  if (latencyRatio > 1.2) {
    regressions.push(`P95 latency increased by ${((latencyRatio - 1) * 100).toFixed(1)}% (${(before.latency.p95TotalMs / 1000).toFixed(1)}s → ${(after.latency.p95TotalMs / 1000).toFixed(1)}s)`);
  } else if (latencyRatio < 0.8) {
    improvements.push(`P95 latency improved by ${((1 - latencyRatio) * 100).toFixed(1)}%`);
  }

  // Low confidence check
  const lowConfDelta = after.confidenceDistribution.lowPercent - before.confidenceDistribution.lowPercent;
  if (lowConfDelta > 5) {
    regressions.push(`Low confidence responses increased from ${before.confidenceDistribution.lowPercent.toFixed(1)}% to ${after.confidenceDistribution.lowPercent.toFixed(1)}%`);
  } else if (lowConfDelta < -5) {
    improvements.push(`Low confidence responses decreased by ${Math.abs(lowConfDelta).toFixed(1)}%`);
  }

  // High confidence check
  const highConfDelta = after.confidenceDistribution.highPercent - before.confidenceDistribution.highPercent;
  if (highConfDelta < -5) {
    regressions.push(`High confidence responses dropped from ${before.confidenceDistribution.highPercent.toFixed(1)}% to ${after.confidenceDistribution.highPercent.toFixed(1)}%`);
  } else if (highConfDelta > 5) {
    improvements.push(`High confidence responses increased by ${highConfDelta.toFixed(1)}%`);
  }

  return {
    hasRegressions: regressions.length > 0,
    regressions,
    improvements
  };
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const compareFile = args.find(arg => arg.startsWith('--compare='))?.split('=')[1];
  const daysBack = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30');
  const ciMode = args.includes('--ci');
  const outputJson = args.includes('--json');
  const baselinePath = args.find(arg => arg.startsWith('--baseline-path='))?.split('=')[1];

  // Capture current baseline
  const currentBaseline = await captureBaseline(daysBack);

  if (!outputJson) {
    printBaseline(currentBaseline);
  }

  let regressionResult: RegressionResult | null = null;

  // Compare if baseline file provided
  if (compareFile) {
    try {
      const previousBaseline = JSON.parse(fs.readFileSync(compareFile, 'utf-8'));
      if (!outputJson) {
        compareBaselines(previousBaseline, currentBaseline);
      }
      regressionResult = checkRegressions(previousBaseline, currentBaseline);
    } catch (err) {
      console.error(`❌ Could not read comparison file: ${compareFile}`);
    }
  }

  // Save baseline
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = baselinePath || `baseline_${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(currentBaseline, null, 2));

  if (!outputJson) {
    console.log(`\n✅ Baseline saved to: ${filename}`);
    console.log(`   To compare later: npx tsx scripts/capture-baseline-metrics.ts --compare=${filename}\n`);
  }

  // JSON output for CI
  if (outputJson) {
    const output = {
      baseline: currentBaseline,
      regressions: regressionResult,
      savedTo: filename
    };
    console.log(JSON.stringify(output, null, 2));
  }

  // CI mode: exit with error if regressions detected
  if (ciMode && regressionResult?.hasRegressions) {
    console.error('\n🚨 CI FAILURE: Regressions detected!');
    for (const r of regressionResult.regressions) {
      console.error(`   - ${r}`);
    }
    process.exit(1);
  }

  // Print summary in CI mode
  if (ciMode && regressionResult) {
    if (regressionResult.improvements.length > 0) {
      console.log('\n✅ Improvements detected:');
      for (const i of regressionResult.improvements) {
        console.log(`   - ${i}`);
      }
    }
    if (!regressionResult.hasRegressions) {
      console.log('\n✅ No regressions detected. Quality gates passed.');
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

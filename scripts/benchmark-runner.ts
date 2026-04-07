#!/usr/bin/env tsx
/**
 * USMLE-Style Benchmark Runner for Navis
 *
 * Runs standardized medical questions through Navis and scores responses
 * against USMLE and NIH study metrics (like OpenEvidence's 100% USMLE score).
 *
 * Usage:
 *   npm run benchmark              # Run all questions
 *   npm run benchmark --question=1 # Run specific question
 *   npm run benchmark --report     # Generate detailed report
 */

import { createClient } from '@supabase/supabase-js';

// ==================== TYPES ====================

interface BenchmarkQuestion {
  id: string;
  category: 'medical_knowledge' | 'clinical_reasoning' | 'biomarker' | 'safety' | 'evidence_quality';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  cancer_type: string;
  question: string;
  expected_elements: {
    must_include: string[];      // Critical facts (binary scoring)
    should_include: string[];    // Important but not critical (partial credit)
    must_cite: string[];         // Required source types
    must_avoid: string[];        // Red flags
  };
  evaluation_focus: {
    accuracy: number;
    clinical_reasoning: number;
    source_support: number;
    completeness: number;
    trustworthiness: number;
    clarity: number;
  };
}

interface BenchmarkResponse {
  question_id: string;
  response_text: string;
  sources: Array<{
    title: string;
    tier: number;
    url?: string;
  }>;
  chunks_retrieved: number;
  response_time_ms: number;
  timestamp: string;
}

interface AutomatedScores {
  must_include_score: number;      // 0-1 (% of critical facts found)
  should_include_score: number;    // 0-1 (% of optional facts found)
  must_cite_score: number;         // 0 or 1 (required citations present)
  must_avoid_penalty: number;      // 0 or negative (red flags found)
  tier1_citation_count: number;    // Count of NCCN/ASCO citations
  tier2_citation_count: number;    // Count of journal citations
  tier3_citation_count: number;    // Count of webinar citations
}

interface DimensionScores {
  accuracy: number;           // 0-4 scale
  clinical_reasoning: number; // 0-4 scale
  source_support: number;     // 0-4 scale
  completeness: number;       // 0-4 scale
  trustworthiness: number;    // 0-4 scale
  clarity: number;            // 0-4 scale
}

interface BenchmarkResult {
  question: BenchmarkQuestion;
  response: BenchmarkResponse;
  automated_scores: AutomatedScores;
  dimension_scores: DimensionScores;
  weighted_score: number;     // 0-4 scale
  needs_human_review: boolean;
  notes: string[];
}

// ==================== BENCHMARK QUESTIONS ====================

const BENCHMARK_QUESTIONS: BenchmarkQuestion[] = [
  {
    id: 'Q1',
    category: 'biomarker',
    difficulty: 'basic',
    cancer_type: 'lymphoma',
    question: 'Which biomarker tests (CD20, PD-L1) are recommended for my Lymphoma?',
    expected_elements: {
      must_include: ['CD20', 'immunohistochemistry', 'B-cell'],
      should_include: ['CD3', 'CD5', 'CD10', 'BCL2', 'BCL6', 'MYC', 'flow cytometry'],
      must_cite: ['NCCN', 'lymphoma'],
      must_avoid: ['PD-L1 is standard for lymphoma', 'PD-L1 required']
    },
    evaluation_focus: {
      accuracy: 0.9,
      clinical_reasoning: 0.3,
      source_support: 0.9,
      completeness: 0.6,
      trustworthiness: 0.5,
      clarity: 0.7
    }
  },
  {
    id: 'Q3',
    category: 'biomarker',
    difficulty: 'advanced',
    cancer_type: 'lung',
    question: 'Which biomarker tests are recommended for a newly diagnosed stage IV non-small cell lung cancer (NSCLC) patient to guide targeted therapy selection?',
    expected_elements: {
      must_include: ['EGFR', 'ALK', 'ROS1', 'PD-L1', 'BRAF'],
      should_include: ['KRAS', 'MET exon 14', 'RET', 'NTRK', 'HER2', 'NGS', 'next-generation sequencing'],
      must_cite: ['NCCN', 'NSCLC', 'lung'],
      must_avoid: ['only if symptomatic', 'only for adenocarcinoma']
    },
    evaluation_focus: {
      accuracy: 1.0,
      clinical_reasoning: 0.8,
      source_support: 0.9,
      completeness: 1.0,
      trustworthiness: 0.7,
      clarity: 0.7
    }
  },
  {
    id: 'Q6',
    category: 'medical_knowledge',
    difficulty: 'basic',
    cancer_type: 'breast',
    question: 'Should I get tested for BRCA1/BRCA2 mutations if I have breast cancer?',
    expected_elements: {
      must_include: ['recommended', 'all breast cancer', 'genetic counseling'],
      should_include: ['PARP inhibitor', 'family', 'PALB2', 'ATM', 'CHEK2', 'ovarian'],
      must_cite: ['NCCN', 'breast', 'genetic'],
      must_avoid: ['only if young', 'only with family history', 'only triple negative']
    },
    evaluation_focus: {
      accuracy: 1.0,
      clinical_reasoning: 0.5,
      source_support: 0.9,
      completeness: 0.7,
      trustworthiness: 0.7,
      clarity: 0.8
    }
  }
];

// ==================== SUPABASE CLIENT ====================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== QUERY NAVIS ====================

async function queryNavis(question: string, cancerType: string): Promise<BenchmarkResponse> {
  const startTime = Date.now();

  try {
    // Call direct-navis edge function
    const { data, error } = await supabase.functions.invoke('direct-navis', {
      body: {
        query: question,
        cancer_type: cancerType,
        user_id: 'benchmark-test',
        session_id: `benchmark-${Date.now()}`
      }
    });

    if (error) {
      throw new Error(`Navis query failed: ${error.message}`);
    }

    const responseTime = Date.now() - startTime;

    return {
      question_id: '',
      response_text: data.response || '',
      sources: (data.sources || []).map((s: any) => ({
        title: s.title || s.guideline_title || 'Unknown',
        tier: s.tier || 3,
        url: s.url || s.citation_url
      })),
      chunks_retrieved: data.chunks?.length || 0,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error querying Navis:', err);
    throw err;
  }
}

// ==================== AUTOMATED SCORING ====================

function calculateAutomatedScores(
  question: BenchmarkQuestion,
  response: BenchmarkResponse
): AutomatedScores {
  const responseText = response.response_text.toLowerCase();

  // Must Include: Critical facts (binary for each, then average)
  const mustIncludeMatches = question.expected_elements.must_include.filter(term =>
    responseText.includes(term.toLowerCase())
  );
  const must_include_score = mustIncludeMatches.length / question.expected_elements.must_include.length;

  // Should Include: Optional facts (partial credit)
  const shouldIncludeMatches = question.expected_elements.should_include.filter(term =>
    responseText.includes(term.toLowerCase())
  );
  const should_include_score = question.expected_elements.should_include.length > 0
    ? shouldIncludeMatches.length / question.expected_elements.should_include.length
    : 1.0;

  // Must Cite: Check if required sources are cited
  const sourceTitles = response.sources.map(s => s.title.toLowerCase()).join(' ');
  const mustCiteMatches = question.expected_elements.must_cite.filter(term =>
    sourceTitles.includes(term.toLowerCase())
  );
  const must_cite_score = mustCiteMatches.length === question.expected_elements.must_cite.length ? 1 : 0;

  // Must Avoid: Red flags (penalty)
  const mustAvoidViolations = question.expected_elements.must_avoid.filter(term =>
    responseText.includes(term.toLowerCase())
  );
  const must_avoid_penalty = mustAvoidViolations.length * -0.5;

  // Tier counts
  const tier1_citation_count = response.sources.filter(s => s.tier === 1).length;
  const tier2_citation_count = response.sources.filter(s => s.tier === 2).length;
  const tier3_citation_count = response.sources.filter(s => s.tier === 3).length;

  return {
    must_include_score,
    should_include_score,
    must_cite_score,
    must_avoid_penalty,
    tier1_citation_count,
    tier2_citation_count,
    tier3_citation_count
  };
}

// ==================== DIMENSION SCORING ====================

function calculateDimensionScores(
  question: BenchmarkQuestion,
  automated: AutomatedScores
): DimensionScores {
  // Accuracy: Based on must_include + must_avoid
  const accuracy_raw = automated.must_include_score + automated.must_avoid_penalty;
  const accuracy = Math.max(0, Math.min(4, accuracy_raw * 4));

  // Source Support: Based on must_cite + tier1 citations
  const source_support_raw = (automated.must_cite_score * 0.6) +
                              (Math.min(automated.tier1_citation_count, 3) / 3 * 0.4);
  const source_support = source_support_raw * 4;

  // Completeness: Based on should_include
  const completeness = automated.should_include_score * 4;

  // Clinical Reasoning: Needs human review - use completeness as proxy
  const clinical_reasoning = completeness * 0.8; // Conservative estimate

  // Trustworthiness: Based on tier1 ratio and must_avoid
  const total_citations = automated.tier1_citation_count +
                          automated.tier2_citation_count +
                          automated.tier3_citation_count;
  const tier1_ratio = total_citations > 0 ? automated.tier1_citation_count / total_citations : 0;
  const trustworthiness_raw = tier1_ratio + (automated.must_avoid_penalty === 0 ? 0.2 : 0);
  const trustworthiness = Math.min(4, trustworthiness_raw * 4);

  // Clarity: Needs human review - placeholder
  const clarity = 3.0; // Assume decent clarity until human review

  return {
    accuracy,
    clinical_reasoning,
    source_support,
    completeness,
    trustworthiness,
    clarity
  };
}

// ==================== WEIGHTED SCORING ====================

function calculateWeightedScore(
  scores: DimensionScores,
  weights: BenchmarkQuestion['evaluation_focus']
): number {
  return (
    scores.accuracy * weights.accuracy +
    scores.clinical_reasoning * weights.clinical_reasoning +
    scores.source_support * weights.source_support +
    scores.completeness * weights.completeness +
    scores.trustworthiness * weights.trustworthiness +
    scores.clarity * weights.clarity
  );
}

// ==================== RUN BENCHMARK ====================

async function runBenchmark(questionId?: string): Promise<BenchmarkResult[]> {
  const questionsToRun = questionId
    ? BENCHMARK_QUESTIONS.filter(q => q.id === questionId)
    : BENCHMARK_QUESTIONS;

  if (questionsToRun.length === 0) {
    console.error(`No question found with ID: ${questionId}`);
    return [];
  }

  const results: BenchmarkResult[] = [];

  for (const question of questionsToRun) {
    console.log(`\n[${ question.id}] Running: ${question.question}`);
    console.log(`Category: ${question.category} | Difficulty: ${question.difficulty}`);

    try {
      // Query Navis
      const response = await queryNavis(question.question, question.cancer_type);
      response.question_id = question.id;

      console.log(`✓ Response received (${response.response_time_ms}ms, ${response.chunks_retrieved} chunks)`);

      // Calculate automated scores
      const automated_scores = calculateAutomatedScores(question, response);

      console.log(`  Must Include: ${(automated_scores.must_include_score * 100).toFixed(0)}%`);
      console.log(`  Should Include: ${(automated_scores.should_include_score * 100).toFixed(0)}%`);
      console.log(`  Citations: T1=${automated_scores.tier1_citation_count} T2=${automated_scores.tier2_citation_count} T3=${automated_scores.tier3_citation_count}`);

      // Calculate dimension scores
      const dimension_scores = calculateDimensionScores(question, automated_scores);

      // Calculate weighted score
      const weighted_score = calculateWeightedScore(dimension_scores, question.evaluation_focus);

      // Determine if human review needed
      const needs_human_review =
        automated_scores.must_include_score < 0.8 ||
        automated_scores.must_avoid_penalty < 0 ||
        automated_scores.tier1_citation_count === 0;

      const notes: string[] = [];
      if (automated_scores.must_include_score < 1.0) {
        const missing = question.expected_elements.must_include.filter(term =>
          !response.response_text.toLowerCase().includes(term.toLowerCase())
        );
        notes.push(`Missing critical elements: ${missing.join(', ')}`);
      }
      if (automated_scores.must_avoid_penalty < 0) {
        notes.push('⚠️  RED FLAG: Response contains items from must_avoid list');
      }
      if (automated_scores.tier1_citation_count === 0) {
        notes.push('⚠️  No tier_1 (NCCN/ASCO) citations');
      }

      const result: BenchmarkResult = {
        question,
        response,
        automated_scores,
        dimension_scores,
        weighted_score,
        needs_human_review,
        notes
      };

      results.push(result);

      console.log(`  Weighted Score: ${weighted_score.toFixed(2)}/4.0`);
      if (needs_human_review) {
        console.log(`  ⚠️  NEEDS HUMAN REVIEW`);
      }

    } catch (err) {
      console.error(`✗ Error running question ${question.id}:`, err);
    }
  }

  return results;
}

// ==================== GENERATE REPORT ====================

function generateReport(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('NAVIS USMLE-STYLE BENCHMARK REPORT');
  console.log('='.repeat(80));

  // Overall statistics
  const totalQuestions = results.length;
  const avgWeightedScore = results.reduce((sum, r) => sum + r.weighted_score, 0) / totalQuestions;
  const percentageScore = (avgWeightedScore / 4.0) * 100;
  const needsReview = results.filter(r => r.needs_human_review).length;

  console.log(`\nOverall Performance:`);
  console.log(`  Questions: ${totalQuestions}`);
  console.log(`  Average Score: ${avgWeightedScore.toFixed(2)}/4.0 (${percentageScore.toFixed(1)}%)`);
  console.log(`  Needs Human Review: ${needsReview}/${totalQuestions}`);

  // Dimension averages
  console.log(`\nDimension Averages (0-4 scale):`);
  const avgDimensions = {
    accuracy: results.reduce((sum, r) => sum + r.dimension_scores.accuracy, 0) / totalQuestions,
    clinical_reasoning: results.reduce((sum, r) => sum + r.dimension_scores.clinical_reasoning, 0) / totalQuestions,
    source_support: results.reduce((sum, r) => sum + r.dimension_scores.source_support, 0) / totalQuestions,
    completeness: results.reduce((sum, r) => sum + r.dimension_scores.completeness, 0) / totalQuestions,
    trustworthiness: results.reduce((sum, r) => sum + r.dimension_scores.trustworthiness, 0) / totalQuestions,
    clarity: results.reduce((sum, r) => sum + r.dimension_scores.clarity, 0) / totalQuestions
  };

  Object.entries(avgDimensions).forEach(([dim, score]) => {
    const bar = '█'.repeat(Math.round(score)) + '░'.repeat(4 - Math.round(score));
    console.log(`  ${dim.padEnd(20)}: ${score.toFixed(2)} ${bar}`);
  });

  // Compare to benchmarks
  console.log(`\nComparison to Benchmarks:`);
  console.log(`  USMLE Passing (~60%):    ${percentageScore >= 60 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  USMLE High Score (~85%): ${percentageScore >= 85 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  OpenEvidence (100%):     ${percentageScore >= 95 ? '✓ PASS' : '✗ FAIL'}`);

  // Category breakdown
  console.log(`\nPerformance by Category:`);
  const categories = Array.from(new Set(results.map(r => r.question.category)));
  categories.forEach(cat => {
    const catResults = results.filter(r => r.question.category === cat);
    const catAvg = catResults.reduce((sum, r) => sum + r.weighted_score, 0) / catResults.length;
    const catPct = (catAvg / 4.0) * 100;
    console.log(`  ${cat.padEnd(20)}: ${catAvg.toFixed(2)}/4.0 (${catPct.toFixed(1)}%)`);
  });

  // Individual results
  console.log(`\nIndividual Question Results:`);
  results.forEach(r => {
    const status = r.weighted_score >= 3.6 ? '✓' : r.weighted_score >= 2.4 ? '~' : '✗';
    console.log(`  [${r.question.id}] ${status} ${r.weighted_score.toFixed(2)}/4.0 - ${r.question.question.substring(0, 60)}...`);
    if (r.notes.length > 0) {
      r.notes.forEach(note => console.log(`       ${note}`));
    }
  });

  console.log('\n' + '='.repeat(80));
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const questionId = args.find(arg => arg.startsWith('--question='))?.split('=')[1];
  const reportOnly = args.includes('--report');

  console.log('Navis USMLE-Style Benchmark Runner');
  console.log('==================================\n');

  if (reportOnly) {
    console.log('Report-only mode not yet implemented');
    return;
  }

  const results = await runBenchmark(questionId);

  if (results.length > 0) {
    generateReport(results);
  }
}

main().catch(console.error);

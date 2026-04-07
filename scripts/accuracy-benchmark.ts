#!/usr/bin/env tsx
/**
 * Accuracy-Only USMLE Benchmark for Navis
 *
 * Tests ONLY medical knowledge accuracy (facts, recency, completeness)
 * Does NOT test source citations, disclaimers, or communication
 *
 * Purpose: Answer the question "Do we have current NCCN content and retrieve it correctly?"
 *
 * Usage:
 *   npm run accuracy-audit
 */

import { createClient } from '@supabase/supabase-js';

// ==================== TYPES ====================

interface AccuracyQuestion {
  id: string;
  cancer_type: string;
  question: string;
  critical_facts: string[];      // Must be present (binary: 0 or 1 per fact)
  optional_facts: string[];      // Nice to have (partial credit)
  outdated_info: string[];       // Red flags (pre-2020 treatment standards)
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

interface AccuracyResult {
  question_id: string;
  question_text: string;
  response_text: string;
  critical_facts_found: number;   // 0-X (count)
  critical_facts_total: number;   // X
  critical_facts_score: number;   // 0-1 (percentage)
  optional_facts_found: number;
  optional_facts_total: number;
  optional_facts_score: number;   // 0-1 (percentage)
  outdated_info_found: string[];  // Array of red flags detected
  has_red_flags: boolean;
  accuracy_score: number;         // 0-100 (percentage)
  response_time_ms: number;
  chunks_retrieved: number;
  pass: boolean;                  // >= 80% on critical facts, no red flags
}

// ==================== USMLE-STYLE ACCURACY QUESTIONS ====================

const ACCURACY_QUESTIONS: AccuracyQuestion[] = [
  {
    id: 'A1',
    cancer_type: 'lymphoma',
    question: 'Which biomarker tests are recommended for newly diagnosed diffuse large B-cell lymphoma (DLBCL)?',
    critical_facts: [
      'CD20',          // B-cell marker, targets rituximab
      'CD10',          // Germinal center marker
      'BCL2',          // Prognosis, double-hit detection
      'BCL6',          // Germinal center marker
      'MYC',           // Double-hit/triple-hit detection
      'Ki-67'          // Proliferation index
    ],
    optional_facts: [
      'CD3',           // T-cell exclusion
      'CD5',           // Help distinguish from mantle cell
      'immunohistochemistry',
      'flow cytometry',
      'FISH',          // For MYC/BCL2/BCL6 rearrangements
      'Hans algorithm', // Cell of origin classification
      'GCB',           // Germinal center B-cell
      'ABC'            // Activated B-cell
    ],
    outdated_info: [
      'PD-L1 is required',  // Not standard for DLBCL
      'PD-L1 required for treatment'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'A2',
    cancer_type: 'lung',
    question: 'Which molecular biomarkers should be tested in a patient with metastatic non-squamous NSCLC before starting treatment?',
    critical_facts: [
      'EGFR',          // Most common, multiple targeted therapies
      'ALK',           // Crizotinib, alectinib, others
      'ROS1',          // Crizotinib, others
      'BRAF V600E',    // Dabrafenib + trametinib
      'PD-L1'          // Immunotherapy selection
    ],
    optional_facts: [
      'KRAS G12C',     // Sotorasib, adagrasib
      'MET exon 14',   // Capmatinib, tepotinib
      'RET',           // Selpercatinib, pralsetinib
      'NTRK',          // Larotrectinib, entrectinib
      'HER2',          // Emerging target
      'NGS',           // Next-generation sequencing panel
      'comprehensive genomic profiling',
      'tissue biopsy',
      'liquid biopsy'
    ],
    outdated_info: [
      'only test if adenocarcinoma',  // Should test all non-squamous
      'only if symptomatic',
      'EGFR only'                      // Must test panel
    ],
    difficulty: 'advanced'
  },
  {
    id: 'A3',
    cancer_type: 'breast',
    question: 'Should all breast cancer patients be offered genetic testing for BRCA mutations?',
    critical_facts: [
      'yes',                    // NCCN 2023+ recommends for ALL
      'all breast cancer',      // Universal, not just young/family history
      'genetic counseling',     // Should include counseling
      'germline testing'        // Not just tumor testing
    ],
    optional_facts: [
      'BRCA1',
      'BRCA2',
      'PARP inhibitor',         // Treatment implication
      'olaparib',
      'talazoparib',
      'family members',         // Cascade testing
      'ovarian cancer risk',
      'PALB2',                  // Other genes in panel
      'ATM',
      'CHEK2',
      'TP53'
    ],
    outdated_info: [
      'only if under 45',       // Outdated - now universal
      'only with family history',
      'only triple negative',
      'only if high risk'
    ],
    difficulty: 'basic'
  },
  {
    id: 'A4',
    cancer_type: 'breast',
    question: 'What is the first-line treatment for HER2-positive metastatic breast cancer?',
    critical_facts: [
      'trastuzumab',            // Anti-HER2 antibody
      'pertuzumab',             // Dual HER2 blockade
      'taxane',                 // Chemotherapy backbone
      'docetaxel'               // Or paclitaxel
    ],
    optional_facts: [
      'paclitaxel',
      'TCHP',                   // Common regimen abbreviation
      'dual HER2 blockade',
      'chemotherapy',
      'cardiac monitoring',     // LVEF monitoring needed
      'LVEF',
      'trastuzumab deruxtecan', // Second-line option
      'T-DXd'
    ],
    outdated_info: [
      'trastuzumab alone',      // Must combine with pertuzumab now
      'no chemotherapy needed'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'A5',
    cancer_type: 'prostate',
    question: 'At what age should average-risk men start discussing prostate cancer screening?',
    critical_facts: [
      '50',                     // Age 50 for average risk
      'shared decision',        // Not automatic screening
      'discuss',                // Informed decision-making
      'PSA'                     // Prostate-specific antigen
    ],
    optional_facts: [
      '45',                     // For high-risk (African American, family hx)
      'African American',
      'family history',
      'digital rectal exam',
      'DRE',
      'benefits and harms',
      'life expectancy',
      '10 years'                // Life expectancy consideration
    ],
    outdated_info: [
      'universal screening',    // Must be shared decision
      'all men should be screened',
      'mandatory PSA'
    ],
    difficulty: 'basic'
  },
  {
    id: 'A6',
    cancer_type: 'melanoma',
    question: 'A patient with stage IV melanoma has BRAF V600E mutation. What are the first-line treatment options?',
    critical_facts: [
      'BRAF inhibitor',         // Targeted therapy option
      'MEK inhibitor',          // Always combine with BRAF
      'immunotherapy',          // Alternative first-line
      'anti-PD-1'               // Nivolumab or pembrolizumab
    ],
    optional_facts: [
      'dabrafenib',             // Specific BRAF inhibitor
      'trametinib',             // Specific MEK inhibitor
      'encorafenib',
      'binimetinib',
      'pembrolizumab',          // Specific anti-PD-1
      'nivolumab',
      'ipilimumab',             // Anti-CTLA-4 (combination)
      'combination therapy',
      'disease burden',         // Factors for choosing
      'LDH',
      'brain metastases'
    ],
    outdated_info: [
      'BRAF alone',             // Must combine with MEK
      'chemotherapy first-line', // Outdated - targeted/immuno now
      'dacarbazine',
      'IL-2 only'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'A7',
    cancer_type: 'lung',
    question: 'What is the role of adjuvant osimertinib in early-stage NSCLC?',
    critical_facts: [
      'EGFR mutation',          // Only for EGFR+ patients
      'stage IB-IIIA',          // Resected stages
      'after surgery',          // Adjuvant = after resection
      '3 years'                 // Duration from ADAURA trial
    ],
    optional_facts: [
      'exon 19 deletion',       // Common EGFR mutations
      'L858R',
      'ADAURA',                 // Trial name
      'resected',
      'disease-free survival',
      'DFS benefit',
      '80mg daily'              // Dose
    ],
    outdated_info: [
      'all NSCLC',              // Only EGFR mutant
      'stage IV',               // Not for metastatic
      'chemotherapy only'       // Outdated - osimertinib now standard
    ],
    difficulty: 'intermediate'
  }
];

// ==================== SUPABASE CLIENT ====================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== QUERY NAVIS ====================

async function queryNavis(question: string, cancerType: string): Promise<{
  response: string;
  chunks: number;
  timeMs: number;
}> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('direct-navis', {
      body: {
        query: question,
        cancer_type: cancerType,
        user_id: 'accuracy-benchmark',
        session_id: `accuracy-${Date.now()}`
      }
    });

    if (error) {
      console.error('Edge function error details:', JSON.stringify(error, null, 2));
      console.error('Response data:', JSON.stringify(data, null, 2));
      throw new Error(`Navis query failed: ${error.message}`);
    }

    return {
      response: data.response || '',
      chunks: data.chunks?.length || 0,
      timeMs: Date.now() - startTime
    };
  } catch (err) {
    console.error('Error querying Navis:', err);
    throw err;
  }
}

// ==================== ACCURACY SCORING ====================

function scoreAccuracy(question: AccuracyQuestion, responseText: string): AccuracyResult {
  const lowerResponse = responseText.toLowerCase();

  // Critical facts (must be present)
  const criticalFound = question.critical_facts.filter(fact =>
    lowerResponse.includes(fact.toLowerCase())
  );
  const criticalScore = criticalFound.length / question.critical_facts.length;

  // Optional facts (partial credit)
  const optionalFound = question.optional_facts.filter(fact =>
    lowerResponse.includes(fact.toLowerCase())
  );
  const optionalScore = question.optional_facts.length > 0
    ? optionalFound.length / question.optional_facts.length
    : 1.0;

  // Red flags (outdated information)
  const redFlags = question.outdated_info.filter(flag =>
    lowerResponse.includes(flag.toLowerCase())
  );

  // Overall accuracy score (0-100)
  // Critical facts: 80% weight
  // Optional facts: 20% weight
  // Red flag penalty: -20 per flag
  const baseScore = (criticalScore * 80) + (optionalScore * 20);
  const penalty = redFlags.length * 20;
  const accuracyScore = Math.max(0, baseScore - penalty);

  // Pass criteria: >= 80% on critical facts AND no red flags
  const pass = criticalScore >= 0.8 && redFlags.length === 0;

  return {
    question_id: question.id,
    question_text: question.question,
    response_text: responseText,
    critical_facts_found: criticalFound.length,
    critical_facts_total: question.critical_facts.length,
    critical_facts_score: criticalScore,
    optional_facts_found: optionalFound.length,
    optional_facts_total: question.optional_facts.length,
    optional_facts_score: optionalScore,
    outdated_info_found: redFlags,
    has_red_flags: redFlags.length > 0,
    accuracy_score: accuracyScore,
    response_time_ms: 0,
    chunks_retrieved: 0,
    pass
  };
}

// ==================== RUN BENCHMARK ====================

async function runAccuracyBenchmark(questionId?: string): Promise<AccuracyResult[]> {
  const questionsToRun = questionId
    ? ACCURACY_QUESTIONS.filter(q => q.id === questionId)
    : ACCURACY_QUESTIONS;

  if (questionsToRun.length === 0) {
    console.error(`❌ No question found with ID: ${questionId}`);
    return [];
  }

  console.log('\n' + '='.repeat(80));
  console.log('NAVIS ACCURACY-ONLY BENCHMARK');
  console.log('Testing medical knowledge accuracy vs USMLE standards');
  console.log('='.repeat(80) + '\n');

  const results: AccuracyResult[] = [];

  for (const question of questionsToRun) {
    console.log(`[${question.id}] ${question.difficulty.toUpperCase()}`);
    console.log(`Cancer: ${question.cancer_type}`);
    console.log(`Question: ${question.question}\n`);

    try {
      // Query Navis
      const { response, chunks, timeMs } = await queryNavis(
        question.question,
        question.cancer_type
      );

      console.log(`✓ Response received (${timeMs}ms, ${chunks} chunks retrieved)\n`);

      // Score accuracy
      const result = scoreAccuracy(question, response);
      result.response_time_ms = timeMs;
      result.chunks_retrieved = chunks;

      // Display results
      console.log('ACCURACY SCORING:');
      console.log(`  Critical Facts: ${result.critical_facts_found}/${result.critical_facts_total} (${(result.critical_facts_score * 100).toFixed(0)}%)`);

      if (result.critical_facts_score < 1.0) {
        const missing = question.critical_facts.filter(f =>
          !response.toLowerCase().includes(f.toLowerCase())
        );
        console.log(`    Missing: ${missing.join(', ')}`);
      }

      console.log(`  Optional Facts: ${result.optional_facts_found}/${result.optional_facts_total} (${(result.optional_facts_score * 100).toFixed(0)}%)`);

      if (result.has_red_flags) {
        console.log(`  ⚠️  RED FLAGS: ${result.outdated_info_found.join(', ')}`);
      }

      console.log(`\n  Overall Accuracy: ${result.accuracy_score.toFixed(1)}/100`);
      console.log(`  Status: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);

      results.push(result);

    } catch (err) {
      console.error(`❌ Error running ${question.id}:`, err);
    }

    console.log('\n' + '-'.repeat(80) + '\n');
  }

  return results;
}

// ==================== GENERATE REPORT ====================

function generateReport(results: AccuracyResult[]): void {
  console.log('='.repeat(80));
  console.log('ACCURACY BENCHMARK REPORT');
  console.log('='.repeat(80) + '\n');

  const totalQuestions = results.length;
  const passed = results.filter(r => r.pass).length;
  const passRate = (passed / totalQuestions) * 100;

  const avgCriticalScore = results.reduce((sum, r) => sum + r.critical_facts_score, 0) / totalQuestions;
  const avgOptionalScore = results.reduce((sum, r) => sum + r.optional_facts_score, 0) / totalQuestions;
  const avgOverallScore = results.reduce((sum, r) => sum + r.accuracy_score, 0) / totalQuestions;
  const totalRedFlags = results.reduce((sum, r) => sum + r.outdated_info_found.length, 0);

  console.log('OVERALL PERFORMANCE:');
  console.log(`  Questions Tested: ${totalQuestions}`);
  console.log(`  Passed: ${passed}/${totalQuestions} (${passRate.toFixed(1)}%)`);
  console.log(`  Average Accuracy: ${avgOverallScore.toFixed(1)}/100\n`);

  console.log('DETAILED METRICS:');
  console.log(`  Critical Facts: ${(avgCriticalScore * 100).toFixed(1)}% coverage`);
  console.log(`  Optional Facts: ${(avgOptionalScore * 100).toFixed(1)}% coverage`);
  console.log(`  Red Flags Found: ${totalRedFlags} total\n`);

  console.log('USMLE COMPARISON:');
  console.log(`  USMLE Passing (~60%):      ${avgOverallScore >= 60 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  USMLE High Score (~85%):   ${avgOverallScore >= 85 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Medical School Honor (~90%): ${avgOverallScore >= 90 ? '✅ PASS' : '❌ FAIL'}\n`);

  console.log('INDIVIDUAL RESULTS:');
  results.forEach(r => {
    const status = r.pass ? '✅' : '❌';
    const redFlagWarning = r.has_red_flags ? ' ⚠️ ' : '';
    console.log(`  [${r.question_id}] ${status} ${r.accuracy_score.toFixed(1)}/100${redFlagWarning}`);
    console.log(`       Critical: ${(r.critical_facts_score * 100).toFixed(0)}% | Optional: ${(r.optional_facts_score * 100).toFixed(0)}%`);
  });

  console.log('\n' + '='.repeat(80));

  // Recommendations
  if (avgCriticalScore < 0.8) {
    console.log('\n⚠️  RECOMMENDATION: Critical fact coverage is below 80%');
    console.log('   → Check NCCN guideline coverage with: npm run audit-nccn-content');
  }

  if (totalRedFlags > 0) {
    console.log('\n⚠️  RECOMMENDATION: Outdated information detected');
    console.log('   → Review and update NCCN guidelines to latest versions');
  }

  if (avgOverallScore >= 90) {
    console.log('\n🎉 EXCELLENT: Navis is performing at medical school honor level!');
  } else if (avgOverallScore >= 85) {
    console.log('\n✅ STRONG: Navis is performing at high USMLE level');
  } else if (avgOverallScore >= 60) {
    console.log('\n✓ PASSING: Navis meets minimum USMLE standards');
  } else {
    console.log('\n❌ NEEDS IMPROVEMENT: Below USMLE passing threshold');
  }
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const questionId = args.find(arg => arg.startsWith('--question='))?.split('=')[1];

  const results = await runAccuracyBenchmark(questionId);

  if (results.length > 0) {
    generateReport(results);
  }
}

main().catch(console.error);

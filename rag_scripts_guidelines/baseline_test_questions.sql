-- ============================================================
-- BASELINE TEST QUESTIONS - Capture Current System Performance
-- ============================================================
-- Run BEFORE implementing semantic search + Claude 3.5 switch
-- Date: October 29, 2025

-- ============================================================
-- Test Questions to Evaluate
-- ============================================================
-- These questions cover different cancer types and query patterns
-- to ensure comprehensive evaluation

-- Copy these questions and ask them through the UI at:
-- http://localhost:8081/response-quality

/*
TEST QUESTIONS (copy these one by one):

1. What are the treatment options for glioblastoma?
   [Expected cancer type: brain, Tests: treatment recommendations, clinical guidelines]

2. What are the side effects of radiation therapy for brain tumors?
   [Expected cancer type: brain, Tests: side effect information, patient guidance]

3. How is breast cancer staged?
   [Expected cancer type: breast, Tests: staging information, diagnostic process]

4. What is the difference between hormone receptor positive and triple negative breast cancer?
   [Expected cancer type: breast, Tests: subtype classification, biomarker understanding]

5. What are the latest immunotherapy options for lung cancer?
   [Expected cancer type: lung, Tests: treatment updates, therapy types]

6. What lifestyle changes can help during cancer treatment?
   [Expected cancer type: general/none, Tests: supportive care, general guidance]

7. What is the prognosis for stage 4 glioblastoma?
   [Expected cancer type: brain, Tests: prognostic information, survival data]

8. Should I get genetic testing for breast cancer?
   [Expected cancer type: breast, Tests: screening guidance, genetic counseling]
*/

-- ============================================================
-- Capture Baseline Results
-- ============================================================
-- After asking all questions above, run this query to capture baseline:

WITH baseline_results AS (
  SELECT
    id,
    question,
    LEFT(answer, 150) as answer_preview,
    created_at,

    -- Quality scores
    accuracy_score,
    completeness_score,
    source_support_score,
    clarity_score,
    overall_confidence,

    -- Latency metrics
    total_latency_ms / 1000.0 as total_seconds,
    search_latency_ms / 1000.0 as search_seconds,
    llm_latency_ms / 1000.0 as llm_seconds,
    evaluation_latency_ms / 1000.0 as eval_seconds,

    -- Retrieval quality
    jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,
    raw_metrics->'cancerType' as detected_cancer_type,
    raw_metrics->'chunksUsed' as chunks_used

  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  LIMIT 10
)
SELECT
  question,
  answer_preview,

  -- Quality (average these to get overall quality)
  accuracy_score,
  completeness_score,
  source_support_score,
  clarity_score,
  overall_confidence,

  -- Latency
  total_seconds,
  search_seconds,
  llm_seconds,
  eval_seconds,

  -- Retrieval
  num_chunks,
  detected_cancer_type,

  created_at
FROM baseline_results
ORDER BY created_at DESC;

-- ============================================================
-- Baseline Summary Statistics
-- ============================================================
SELECT
  COUNT(*) as total_tests,

  -- Quality averages
  ROUND(AVG(accuracy_score), 2) as avg_accuracy,
  ROUND(AVG(completeness_score), 2) as avg_completeness,
  ROUND(AVG(source_support_score), 2) as avg_source_support,
  ROUND(AVG(clarity_score), 2) as avg_clarity,
  ROUND(AVG(overall_confidence), 2) as avg_confidence,

  -- Latency averages
  ROUND(AVG(total_latency_ms) / 1000.0, 2) as avg_total_sec,
  ROUND(AVG(search_latency_ms) / 1000.0, 2) as avg_search_sec,
  ROUND(AVG(llm_latency_ms) / 1000.0, 2) as avg_llm_sec,
  ROUND(AVG(evaluation_latency_ms) / 1000.0, 2) as avg_eval_sec,

  -- Retrieval averages
  ROUND(AVG(jsonb_array_length(raw_metrics->'retrievedChunks')), 1) as avg_chunks

FROM response_evaluations
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND total_latency_ms IS NOT NULL;

-- Expected baseline (current system with text search + Claude 4.5):
-- avg_total_sec: 20-25 seconds
-- avg_search_sec: 1-2 seconds (when it works)
-- avg_llm_sec: 18-23 seconds
-- avg_chunks: 3-8 (or 0 if cancer type mismatch)

-- ============================================================
-- Save Baseline Results to Temporary Table (Optional)
-- ============================================================
DROP TABLE IF EXISTS baseline_comparison;

CREATE TABLE baseline_comparison AS
SELECT
  'baseline' as test_type,
  id,
  question,
  answer,
  accuracy_score,
  completeness_score,
  source_support_score,
  clarity_score,
  overall_confidence,
  total_latency_ms,
  search_latency_ms,
  llm_latency_ms,
  evaluation_latency_ms,
  jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,
  raw_metrics->'cancerType' as cancer_type,
  created_at
FROM response_evaluations
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

SELECT * FROM baseline_comparison;

-- ============================================================
-- NEXT STEPS
-- ============================================================
-- 1. Ask all 8 test questions through the UI
-- 2. Run the summary statistics query above
-- 3. Save the results (copy/paste or screenshot)
-- 4. Implement semantic search + Claude 3.5
-- 5. Ask the SAME questions again
-- 6. Run comparison queries (see comparison_after_changes.sql)

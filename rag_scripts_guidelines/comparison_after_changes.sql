-- ============================================================
-- COMPARISON ANALYSIS - After Semantic Search + Claude 3.5
-- ============================================================
-- Run this AFTER implementing changes and testing with same questions
-- Date: October 29, 2025

-- ============================================================
-- Step 1: Capture Post-Change Results
-- ============================================================
WITH post_change_results AS (
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
    raw_metrics->'searchMethod' as search_method

  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '30 minutes'  -- Recent tests only
  ORDER BY created_at DESC
  LIMIT 10
)
SELECT
  question,
  answer_preview,

  -- Quality
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
  search_method,

  created_at
FROM post_change_results
ORDER BY created_at DESC;

-- ============================================================
-- Step 2: Summary Comparison (Recent vs Baseline)
-- ============================================================
WITH baseline AS (
  SELECT
    'baseline' as version,
    COUNT(*) as total_tests,
    ROUND(AVG(accuracy_score), 2) as avg_accuracy,
    ROUND(AVG(completeness_score), 2) as avg_completeness,
    ROUND(AVG(source_support_score), 2) as avg_source_support,
    ROUND(AVG(clarity_score), 2) as avg_clarity,
    ROUND(AVG(overall_confidence), 2) as avg_confidence,
    ROUND(AVG(total_latency_ms) / 1000.0, 2) as avg_total_sec,
    ROUND(AVG(search_latency_ms) / 1000.0, 2) as avg_search_sec,
    ROUND(AVG(llm_latency_ms) / 1000.0, 2) as avg_llm_sec,
    ROUND(AVG(jsonb_array_length(raw_metrics->'retrievedChunks')), 1) as avg_chunks
  FROM response_evaluations
  WHERE created_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '1 hour'
    AND total_latency_ms IS NOT NULL
),
post_change AS (
  SELECT
    'post_change' as version,
    COUNT(*) as total_tests,
    ROUND(AVG(accuracy_score), 2) as avg_accuracy,
    ROUND(AVG(completeness_score), 2) as avg_completeness,
    ROUND(AVG(source_support_score), 2) as avg_source_support,
    ROUND(AVG(clarity_score), 2) as avg_clarity,
    ROUND(AVG(overall_confidence), 2) as avg_confidence,
    ROUND(AVG(total_latency_ms) / 1000.0, 2) as avg_total_sec,
    ROUND(AVG(search_latency_ms) / 1000.0, 2) as avg_search_sec,
    ROUND(AVG(llm_latency_ms) / 1000.0, 2) as avg_llm_sec,
    ROUND(AVG(jsonb_array_length(raw_metrics->'retrievedChunks')), 1) as avg_chunks
  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND total_latency_ms IS NOT NULL
)
SELECT
  version,
  total_tests,
  avg_accuracy,
  avg_completeness,
  avg_source_support,
  avg_clarity,
  avg_confidence,
  avg_total_sec,
  avg_search_sec,
  avg_llm_sec,
  avg_chunks
FROM baseline
UNION ALL
SELECT
  version,
  total_tests,
  avg_accuracy,
  avg_completeness,
  avg_source_support,
  avg_clarity,
  avg_confidence,
  avg_total_sec,
  avg_search_sec,
  avg_llm_sec,
  avg_chunks
FROM post_change;

-- Expected results:
-- baseline:    avg_total_sec: 20-25, avg_llm_sec: 18-23, avg_chunks: 0-8 (inconsistent)
-- post_change: avg_total_sec: 8-12,  avg_llm_sec: 6-10,  avg_chunks: 5-8 (consistent)

-- ============================================================
-- Step 3: Detailed Side-by-Side Comparison
-- ============================================================
WITH baseline AS (
  SELECT
    question,
    'baseline' as version,
    accuracy_score,
    completeness_score,
    source_support_score,
    overall_confidence,
    total_latency_ms / 1000.0 as total_sec,
    llm_latency_ms / 1000.0 as llm_sec,
    jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,
    raw_metrics->'searchMethod' as search_method
  FROM response_evaluations
  WHERE created_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '1 hour'
    AND total_latency_ms IS NOT NULL
),
post_change AS (
  SELECT
    question,
    'post_change' as version,
    accuracy_score,
    completeness_score,
    source_support_score,
    overall_confidence,
    total_latency_ms / 1000.0 as total_sec,
    llm_latency_ms / 1000.0 as llm_sec,
    jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,
    raw_metrics->'searchMethod' as search_method
  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND total_latency_ms IS NOT NULL
)
SELECT
  b.question,

  -- Quality comparison
  b.accuracy_score as baseline_accuracy,
  p.accuracy_score as new_accuracy,
  ROUND(p.accuracy_score - b.accuracy_score, 2) as accuracy_delta,

  b.overall_confidence as baseline_confidence,
  p.overall_confidence as new_confidence,
  ROUND(p.overall_confidence - b.overall_confidence, 2) as confidence_delta,

  -- Latency comparison
  b.total_sec as baseline_total_sec,
  p.total_sec as new_total_sec,
  ROUND(p.total_sec - b.total_sec, 2) as total_sec_delta,
  ROUND((p.total_sec - b.total_sec) / b.total_sec * 100, 1) as pct_change,

  -- Retrieval comparison
  b.num_chunks as baseline_chunks,
  p.num_chunks as new_chunks,

  b.search_method as baseline_method,
  p.search_method as new_method

FROM baseline b
FULL OUTER JOIN post_change p ON LOWER(TRIM(b.question)) = LOWER(TRIM(p.question))
WHERE b.question IS NOT NULL OR p.question IS NOT NULL
ORDER BY b.question;

-- ============================================================
-- Step 4: Search Method Distribution
-- ============================================================
SELECT
  CASE
    WHEN created_at > NOW() - INTERVAL '30 minutes' THEN 'post_change'
    ELSE 'baseline'
  END as version,
  raw_metrics->>'searchMethod' as search_method,
  COUNT(*) as count,
  ROUND(AVG(jsonb_array_length(raw_metrics->'retrievedChunks')), 1) as avg_chunks,
  ROUND(AVG(total_latency_ms) / 1000.0, 2) as avg_total_sec
FROM response_evaluations
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND total_latency_ms IS NOT NULL
GROUP BY 1, 2
ORDER BY 1, 3 DESC;

-- Expected baseline methods: optimized_text_search, direct_api_fallback
-- Expected post_change methods: semantic_vector_similarity

-- ============================================================
-- Step 5: Quality Score Changes
-- ============================================================
WITH baseline_avg AS (
  SELECT
    AVG(accuracy_score) as avg_accuracy,
    AVG(completeness_score) as avg_completeness,
    AVG(source_support_score) as avg_source_support,
    AVG(clarity_score) as avg_clarity,
    AVG(overall_confidence) as avg_confidence
  FROM response_evaluations
  WHERE created_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '1 hour'
    AND total_latency_ms IS NOT NULL
),
post_change_avg AS (
  SELECT
    AVG(accuracy_score) as avg_accuracy,
    AVG(completeness_score) as avg_completeness,
    AVG(source_support_score) as avg_source_support,
    AVG(clarity_score) as avg_clarity,
    AVG(overall_confidence) as avg_confidence
  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND total_latency_ms IS NOT NULL
)
SELECT
  'accuracy' as metric,
  ROUND(b.avg_accuracy, 3) as baseline,
  ROUND(p.avg_accuracy, 3) as post_change,
  ROUND(p.avg_accuracy - b.avg_accuracy, 3) as delta,
  CASE
    WHEN p.avg_accuracy - b.avg_accuracy > 0.05 THEN '✅ Significant improvement'
    WHEN p.avg_accuracy - b.avg_accuracy < -0.05 THEN '⚠️ Degradation'
    ELSE '≈ No significant change'
  END as assessment
FROM baseline_avg b, post_change_avg p

UNION ALL

SELECT
  'completeness' as metric,
  ROUND(b.avg_completeness, 3),
  ROUND(p.avg_completeness, 3),
  ROUND(p.avg_completeness - b.avg_completeness, 3),
  CASE
    WHEN p.avg_completeness - b.avg_completeness > 0.05 THEN '✅ Significant improvement'
    WHEN p.avg_completeness - b.avg_completeness < -0.05 THEN '⚠️ Degradation'
    ELSE '≈ No significant change'
  END
FROM baseline_avg b, post_change_avg p

UNION ALL

SELECT
  'source_support' as metric,
  ROUND(b.avg_source_support, 3),
  ROUND(p.avg_source_support, 3),
  ROUND(p.avg_source_support - b.avg_source_support, 3),
  CASE
    WHEN p.avg_source_support - b.avg_source_support > 0.05 THEN '✅ Significant improvement'
    WHEN p.avg_source_support - b.avg_source_support < -0.05 THEN '⚠️ Degradation'
    ELSE '≈ No significant change'
  END
FROM baseline_avg b, post_change_avg p

UNION ALL

SELECT
  'overall_confidence' as metric,
  ROUND(b.avg_confidence, 3),
  ROUND(p.avg_confidence, 3),
  ROUND(p.avg_confidence - b.avg_confidence, 3),
  CASE
    WHEN p.avg_confidence - b.avg_confidence > 0.05 THEN '✅ Significant improvement'
    WHEN p.avg_confidence - b.avg_confidence < -0.05 THEN '⚠️ Degradation'
    ELSE '≈ No significant change'
  END
FROM baseline_avg b, post_change_avg p;

-- ============================================================
-- Step 6: Latency Breakdown Changes
-- ============================================================
WITH baseline_avg AS (
  SELECT
    AVG(total_latency_ms) / 1000.0 as avg_total,
    AVG(search_latency_ms) / 1000.0 as avg_search,
    AVG(llm_latency_ms) / 1000.0 as avg_llm,
    AVG(evaluation_latency_ms) / 1000.0 as avg_eval
  FROM response_evaluations
  WHERE created_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '1 hour'
    AND total_latency_ms IS NOT NULL
),
post_change_avg AS (
  SELECT
    AVG(total_latency_ms) / 1000.0 as avg_total,
    AVG(search_latency_ms) / 1000.0 as avg_search,
    AVG(llm_latency_ms) / 1000.0 as avg_llm,
    AVG(evaluation_latency_ms) / 1000.0 as avg_eval
  FROM response_evaluations
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND total_latency_ms IS NOT NULL
)
SELECT
  'total' as component,
  ROUND(b.avg_total, 2) as baseline_sec,
  ROUND(p.avg_total, 2) as post_change_sec,
  ROUND(p.avg_total - b.avg_total, 2) as delta_sec,
  ROUND((p.avg_total - b.avg_total) / b.avg_total * 100, 1) as pct_change,
  CASE
    WHEN (p.avg_total - b.avg_total) / b.avg_total < -0.4 THEN '🚀 Major speedup!'
    WHEN (p.avg_total - b.avg_total) / b.avg_total < -0.2 THEN '✅ Good speedup'
    WHEN (p.avg_total - b.avg_total) / b.avg_total > 0.2 THEN '⚠️ Slower'
    ELSE '≈ No significant change'
  END as assessment
FROM baseline_avg b, post_change_avg p

UNION ALL

SELECT
  'llm' as component,
  ROUND(b.avg_llm, 2),
  ROUND(p.avg_llm, 2),
  ROUND(p.avg_llm - b.avg_llm, 2),
  ROUND((p.avg_llm - b.avg_llm) / b.avg_llm * 100, 1),
  CASE
    WHEN (p.avg_llm - b.avg_llm) / b.avg_llm < -0.4 THEN '🚀 Major speedup!'
    WHEN (p.avg_llm - b.avg_llm) / b.avg_llm < -0.2 THEN '✅ Good speedup'
    WHEN (p.avg_llm - b.avg_llm) / b.avg_llm > 0.2 THEN '⚠️ Slower'
    ELSE '≈ No significant change'
  END
FROM baseline_avg b, post_change_avg p

UNION ALL

SELECT
  'search' as component,
  ROUND(b.avg_search, 2),
  ROUND(p.avg_search, 2),
  ROUND(p.avg_search - b.avg_search, 2),
  ROUND((p.avg_search - b.avg_search) / NULLIF(b.avg_search, 0) * 100, 1),
  CASE
    WHEN (p.avg_search - b.avg_search) / NULLIF(b.avg_search, 0) < -0.3 THEN '✅ Faster'
    WHEN (p.avg_search - b.avg_search) / NULLIF(b.avg_search, 0) > 0.3 THEN '⚠️ Slower'
    ELSE '≈ No significant change'
  END
FROM baseline_avg b, post_change_avg p;

-- Expected results:
-- total: -60% (major speedup)
-- llm: -60% (Claude 3.5 faster than 4.5)
-- search: similar or slightly slower (embedding generation adds overhead)

-- ============================================================
-- SUMMARY CHECKLIST
-- ============================================================
-- [ ] Latency reduced by 40-60%
-- [ ] LLM time reduced significantly (Claude 3.5 vs 4.5)
-- [ ] Quality scores remain stable (within ±0.05)
-- [ ] Chunks retrieved consistently (no more 0-chunk responses)
-- [ ] Search method changed to semantic_vector_similarity
-- [ ] No significant errors in function logs

-- If all pass: ✅ DEPLOYMENT SUCCESSFUL!
-- If quality degraded: Consider adjusting similarity threshold or reverting model
-- If still slow: Check function logs for bottlenecks

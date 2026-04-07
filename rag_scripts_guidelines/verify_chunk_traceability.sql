-- ============================================================
-- CHUNK TRACEABILITY VERIFICATION SCRIPT (FIXED)
-- ============================================================
-- Run this in Supabase SQL Editor after asking a test question
-- Date: October 29, 2025

-- ============================================================
-- Step 1: Check Most Recent Response Has Chunk Data + Latency
-- ============================================================
SELECT
  id,
  question,
  LEFT(answer, 100) as answer_preview,
  created_at,
  raw_metrics->'retrievedChunks' as chunk_data,
  jsonb_array_length(raw_metrics->'retrievedChunks') as num_chunks,
  -- Latency breakdown to identify bottlenecks
  total_latency_ms / 1000.0 as total_seconds,
  search_latency_ms / 1000.0 as search_seconds,
  llm_latency_ms / 1000.0 as llm_seconds,
  evaluation_latency_ms / 1000.0 as eval_seconds
FROM response_evaluations
ORDER BY created_at DESC
LIMIT 1;

-- Expected Results:
-- ✅ chunk_data: Array of chunk objects with IDs and metadata
-- ✅ num_chunks: 3-8 (typical range)
-- ⏱️ total_seconds: Should be < 15 seconds (if higher, there's a bottleneck)
-- ⏱️ search_seconds: Should be < 3 seconds
-- ⏱️ llm_seconds: Should be < 12 seconds
-- ⏱️ eval_seconds: Should be < 3 seconds


-- ============================================================
-- Step 2: Extract Individual Chunks from Most Recent Response
-- ============================================================
SELECT
  question,
  chunk_data->>'id' as chunk_id,
  chunk_data->>'guideline_title' as guideline,
  chunk_data->>'guideline_source' as source,
  chunk_data->>'cancer_type' as cancer_type,
  chunk_data->>'chunk_index' as chunk_num,
  chunk_data->>'page_start' as page_start,
  chunk_data->>'page_end' as page_end,
  chunk_data->>'similarity' as relevance_score,
  chunk_data->>'content_tier' as tier,
  LEFT(chunk_data->>'chunk_text_preview', 100) as preview
FROM response_evaluations,
  jsonb_array_elements(raw_metrics->'retrievedChunks') as chunk_data
ORDER BY created_at DESC
LIMIT 10;

-- Expected: List of chunks with UUIDs, titles, sources, previews
-- This proves chunk IDs and metadata are being saved


-- ============================================================
-- Step 3: Verify Chunk IDs Match Database Records
-- ============================================================
WITH recent_chunks AS (
  SELECT
    chunk_data->>'id' as chunk_id
  FROM response_evaluations,
    jsonb_array_elements(raw_metrics->'retrievedChunks') as chunk_data
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  gc.id,
  gc.guideline_title,
  gc.guideline_source,
  gc.cancer_type,
  gc.chunk_index,
  gc.page_start,
  gc.page_end,
  LEFT(gc.chunk_text, 150) as actual_chunk_text,
  gc.content_tier,
  gc.created_at as chunk_created_at
FROM guideline_chunks gc
WHERE gc.id::text IN (SELECT chunk_id FROM recent_chunks);

-- Expected: Returns actual chunk records from guideline_chunks table
-- This proves the chunk IDs are valid and traceable


-- ============================================================
-- Step 4: Full Audit Trail - Response → Chunk → Original Source
-- ============================================================
WITH response_audit AS (
  SELECT
    re.id as response_id,
    re.question,
    re.answer,
    re.created_at as response_time,
    chunk_data->>'id' as chunk_id,
    chunk_data->>'guideline_title' as used_guideline,
    chunk_data->>'chunk_text_preview' as used_preview
  FROM response_evaluations re,
    jsonb_array_elements(re.raw_metrics->'retrievedChunks') as chunk_data
  ORDER BY re.created_at DESC
  LIMIT 1
)
SELECT
  ra.question as "Question Asked",
  LEFT(ra.answer, 200) as "AI Response Preview",
  ra.used_guideline as "Source Guideline",
  gc.guideline_source as "Source Organization",
  gc.cancer_type as "Cancer Type",
  gc.chunk_index as "Chunk Number",
  COALESCE(gc.page_start::text || '-' || gc.page_end::text, 'N/A') as "Pages",
  COALESCE(gc.section_heading, 'N/A') as "Section",
  ra.used_preview as "Used Content Preview",
  LEFT(gc.chunk_text, 200) as "Actual Content in Database",
  gc.content_tier as "Quality Tier",
  gc.created_at as "Content Added Date"
FROM response_audit ra
JOIN guideline_chunks gc ON gc.id::text = ra.chunk_id;

-- Expected: Complete audit trail showing:
-- - What was asked
-- - What AI responded
-- - Which guideline was cited
-- - What the actual source content says
-- - Page numbers and sections
-- This is the "smoking gun" proof of traceability!


-- ============================================================
-- Step 5: Latency Analysis - Find Bottlenecks
-- ============================================================
SELECT
  COUNT(*) as total_responses,
  AVG(total_latency_ms) / 1000.0 as avg_total_sec,
  AVG(search_latency_ms) / 1000.0 as avg_search_sec,
  AVG(llm_latency_ms) / 1000.0 as avg_llm_sec,
  AVG(evaluation_latency_ms) / 1000.0 as avg_eval_sec,
  MAX(total_latency_ms) / 1000.0 as max_total_sec,
  MIN(total_latency_ms) / 1000.0 as min_total_sec,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_latency_ms) / 1000.0 as p95_sec
FROM response_evaluations
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND total_latency_ms IS NOT NULL;

-- Latency Benchmarks:
-- ✅ avg_total_sec < 10: Good
-- ⚠️ avg_total_sec 10-15: Acceptable
-- 🔴 avg_total_sec > 15: Too slow, needs optimization
--
-- Breakdown:
-- - avg_search_sec should be < 2
-- - avg_llm_sec should be < 10
-- - avg_eval_sec should be < 2


-- ============================================================
-- Step 6: Identify Slow Responses
-- ============================================================
SELECT
  LEFT(question, 60) as question,
  total_latency_ms / 1000.0 as total_sec,
  search_latency_ms / 1000.0 as search_sec,
  llm_latency_ms / 1000.0 as llm_sec,
  evaluation_latency_ms / 1000.0 as eval_sec,
  CASE
    WHEN search_latency_ms > 3000 THEN '🐌 Slow search'
    WHEN llm_latency_ms > 12000 THEN '🐌 Slow LLM'
    WHEN evaluation_latency_ms > 3000 THEN '🐌 Slow evaluation'
    ELSE '✅ OK'
  END as bottleneck,
  created_at
FROM response_evaluations
WHERE total_latency_ms > 10000  -- More than 10 seconds
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY total_latency_ms DESC
LIMIT 10;

-- This identifies which component is causing slowness


-- ============================================================
-- Step 7: Chunk Usage Statistics
-- ============================================================
SELECT
  COUNT(DISTINCT re.id) as total_responses,
  COUNT(DISTINCT re.id) FILTER (
    WHERE jsonb_array_length(re.raw_metrics->'retrievedChunks') > 0
  ) as responses_with_chunks,
  AVG(jsonb_array_length(re.raw_metrics->'retrievedChunks')) as avg_chunks_per_response,
  MAX(created_at) as most_recent_response
FROM response_evaluations re
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Expected:
-- - responses_with_chunks should equal total_responses (100% have chunks)
-- - avg_chunks_per_response: typically 3-8


-- ============================================================
-- Step 8: Content Source Breakdown
-- ============================================================
SELECT
  chunk_data->>'guideline_source' as source,
  chunk_data->>'content_tier' as tier,
  COUNT(*) as times_cited,
  COUNT(DISTINCT re.id) as unique_responses
FROM response_evaluations re,
  jsonb_array_elements(re.raw_metrics->'retrievedChunks') as chunk_data
WHERE re.created_at > NOW() - INTERVAL '24 hours'
GROUP BY chunk_data->>'guideline_source', chunk_data->>'content_tier'
ORDER BY times_cited DESC;

-- Shows which sources are being cited most
-- Helps validate you're using high-quality (Tier 1) sources


-- ============================================================
-- Step 9: Hallucination Check (Advanced)
-- ============================================================
WITH response_sources AS (
  SELECT
    id,
    answer,
    raw_metrics->'retrievedChunks' as chunks
  FROM response_evaluations
  ORDER BY created_at DESC
  LIMIT 10
),
actual_sources AS (
  SELECT
    rs.id,
    LEFT(rs.answer, 150) as answer_preview,
    array_agg(DISTINCT chunk_data->>'guideline_source') as sources_used
  FROM response_sources rs,
    jsonb_array_elements(rs.chunks) as chunk_data
  GROUP BY rs.id, rs.answer
)
SELECT
  id,
  answer_preview,
  sources_used as "Sources Actually Retrieved",
  -- Check if response mentions sources not in retrieved chunks
  CASE
    WHEN answer_preview LIKE '%NCCN%' AND 'NCCN' = ANY(sources_used) THEN '✅ NCCN verified'
    WHEN answer_preview LIKE '%NCCN%' AND NOT ('NCCN' = ANY(sources_used)) THEN '⚠️ NCCN mentioned but not in chunks'
    WHEN answer_preview LIKE '%ASCO%' AND 'ASCO' = ANY(sources_used) THEN '✅ ASCO verified'
    WHEN answer_preview LIKE '%ASCO%' AND NOT ('ASCO' = ANY(sources_used)) THEN '⚠️ ASCO mentioned but not in chunks'
    ELSE '✅ No source mentions or all verified'
  END as verification_status
FROM actual_sources;

-- ⚠️ If you see "mentioned but not in chunks" → potential hallucination
-- ✅ If "verified" → AI is correctly citing retrieved sources


-- ============================================================
-- VERIFICATION CHECKLIST
-- ============================================================
-- Run each step above and verify:
-- [ ] Step 1: raw_metrics has retrievedChunks array with data
-- [ ] Step 2: Can extract chunk IDs, titles, previews
-- [ ] Step 3: Chunk IDs match actual records in guideline_chunks
-- [ ] Step 4: Can trace response → chunk → guideline → page
-- [ ] Step 5: Average latency is acceptable
-- [ ] Step 6: Identified any bottlenecks
-- [ ] Step 7: All recent responses have chunk data
-- [ ] Step 8: Using primarily Tier 1 sources
-- [ ] Step 9: No hallucinations detected

-- If all pass: ✅ CHUNK TRACEABILITY + LATENCY TRACKING IS WORKING!

-- ============================================================
-- NEXT STEPS BASED ON RESULTS
-- ============================================================
-- If avg_total_sec > 15 seconds:
--   1. Check which component is slow (search, llm, or eval)
--   2. Apply optimizations from docs/LATENCY_OPTIMIZATION.md
--   3. Options: reduce chunks, use faster model, skip evaluation
--
-- If chunk_data is empty or null:
--   1. Verify function deployed: npx supabase functions list
--   2. Check function logs for errors
--   3. Ensure you asked a question AFTER deploying updated function
--
-- If chunks can't be found in guideline_chunks table:
--   1. Chunk IDs might be corrupted
--   2. Re-deploy function
--   3. Process PDFs again with Python script

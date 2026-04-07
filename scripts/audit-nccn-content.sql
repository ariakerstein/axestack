-- =====================================================
-- NCCN Content Audit: Coverage & Recency Check
-- =====================================================
-- Purpose: Verify we have current NCCN guidelines ingested
-- Run with: psql $DATABASE_URL -f scripts/audit-nccn-content.sql

\echo '===================================================='
\echo 'PART 1: NCCN GUIDELINE COVERAGE'
\echo '===================================================='
\echo ''

-- 1.1 What NCCN guidelines do we have?
\echo '1. NCCN Guidelines by Cancer Type'
\echo '-----------------------------------'
SELECT
  cancer_type,
  COUNT(DISTINCT guideline_title) as unique_guidelines,
  COUNT(*) as total_chunks,
  MIN(created_at::date) as oldest_chunk,
  MAX(created_at::date) as newest_chunk
FROM guideline_chunks
WHERE tier = 1  -- tier_1 = NCCN/ASCO
  AND (
    guideline_title ILIKE '%NCCN%'
    OR storage_path LIKE 'guidelines/%'
    OR storage_path LIKE 'NCCN_general/%'
  )
GROUP BY cancer_type
ORDER BY total_chunks DESC;

\echo ''
\echo '2. Top NCCN Guidelines by Chunk Count'
\echo '--------------------------------------'
SELECT
  guideline_title,
  cancer_type,
  COUNT(*) as chunks,
  tier,
  MAX(created_at::date) as last_updated
FROM guideline_chunks
WHERE tier = 1
  AND (
    guideline_title ILIKE '%NCCN%'
    OR storage_path LIKE 'guidelines/%'
  )
GROUP BY guideline_title, cancer_type, tier
ORDER BY chunks DESC
LIMIT 20;

\echo ''
\echo '===================================================='
\echo 'PART 2: RECENCY CHECK (Version Detection)'
\echo '===================================================='
\echo ''

-- 2.1 Try to extract version/year from guideline titles
\echo '3. NCCN Guideline Versions (where detectable)'
\echo '----------------------------------------------'
SELECT
  guideline_title,
  cancer_type,
  -- Try to extract version numbers or years
  CASE
    WHEN guideline_title ~ 'Version \d+\.\d{4}' THEN
      (regexp_match(guideline_title, 'Version (\d+\.\d{4})'))[1]
    WHEN guideline_title ~ 'V\d+\.\d{4}' THEN
      (regexp_match(guideline_title, 'V(\d+\.\d{4})'))[1]
    WHEN guideline_title ~ '\d{4}' THEN
      (regexp_match(guideline_title, '(\d{4})'))[1]
    ELSE 'Unknown'
  END as detected_version,
  COUNT(*) as chunks,
  MAX(created_at::date) as ingestion_date
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%'
GROUP BY guideline_title, cancer_type
ORDER BY detected_version DESC, chunks DESC;

\echo ''
\echo '4. NCCN Files in Storage (from storage_path)'
\echo '---------------------------------------------'
SELECT
  storage_path,
  COUNT(DISTINCT guideline_title) as guidelines_using_this_file,
  COUNT(*) as total_chunks,
  MIN(cancer_type) as example_cancer_type
FROM guideline_chunks
WHERE tier = 1
  AND (
    storage_path LIKE 'guidelines/%'
    OR storage_path LIKE 'NCCN_general/%'
  )
GROUP BY storage_path
ORDER BY total_chunks DESC;

\echo ''
\echo '===================================================='
\echo 'PART 3: CRITICAL CANCER TYPES - COVERAGE CHECK'
\echo '===================================================='
\echo ''

-- 3.1 Check if we have NCCN content for most common cancers
\echo '5. Common Cancer Types - NCCN Coverage Status'
\echo '----------------------------------------------'
WITH common_cancers AS (
  SELECT unnest(ARRAY[
    'breast', 'lung', 'NSCLC', 'SCLC',
    'prostate', 'colorectal', 'melanoma',
    'lymphoma', 'NHL', 'Hodgkin',
    'leukemia', 'AML', 'CLL',
    'pancreatic', 'ovarian', 'bladder',
    'kidney', 'liver', 'stomach',
    'thyroid', 'multiple myeloma'
  ]) as cancer_name
)
SELECT
  cc.cancer_name,
  COUNT(DISTINCT gc.guideline_title) as nccn_guidelines,
  COUNT(gc.id) as nccn_chunks,
  CASE
    WHEN COUNT(gc.id) > 100 THEN '✅ Good Coverage'
    WHEN COUNT(gc.id) > 0 THEN '⚠️  Limited Coverage'
    ELSE '❌ Missing'
  END as status
FROM common_cancers cc
LEFT JOIN guideline_chunks gc ON (
  gc.tier = 1
  AND gc.cancer_type ILIKE '%' || cc.cancer_name || '%'
)
GROUP BY cc.cancer_name
ORDER BY nccn_chunks DESC;

\echo ''
\echo '===================================================='
\echo 'PART 4: RECENCY WARNINGS'
\echo '===================================================='
\echo ''

-- 4.1 Flag potentially outdated content (ingested >1 year ago)
\echo '6. Potentially Outdated NCCN Content'
\echo '------------------------------------'
SELECT
  cancer_type,
  guideline_title,
  COUNT(*) as chunks,
  MAX(created_at::date) as last_ingested,
  CURRENT_DATE - MAX(created_at::date) as days_since_ingestion,
  CASE
    WHEN CURRENT_DATE - MAX(created_at::date) > 365 THEN '🔴 >1 year old'
    WHEN CURRENT_DATE - MAX(created_at::date) > 180 THEN '🟡 >6 months old'
    ELSE '🟢 Recent'
  END as freshness
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%'
GROUP BY cancer_type, guideline_title
HAVING CURRENT_DATE - MAX(created_at::date) > 180
ORDER BY days_since_ingestion DESC;

\echo ''
\echo '===================================================='
\echo 'SUMMARY STATISTICS'
\echo '===================================================='
\echo ''

\echo '7. Overall NCCN Content Summary'
\echo '--------------------------------'
SELECT
  'Total NCCN chunks' as metric,
  COUNT(*)::text as value
FROM guideline_chunks
WHERE tier = 1
  AND (
    guideline_title ILIKE '%NCCN%'
    OR storage_path LIKE 'guidelines/%'
  )
UNION ALL
SELECT
  'Unique NCCN guidelines',
  COUNT(DISTINCT guideline_title)::text
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%'
UNION ALL
SELECT
  'Cancer types covered',
  COUNT(DISTINCT cancer_type)::text
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%'
UNION ALL
SELECT
  'Oldest NCCN content',
  MIN(created_at::date)::text
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%'
UNION ALL
SELECT
  'Newest NCCN content',
  MAX(created_at::date)::text
FROM guideline_chunks
WHERE tier = 1
  AND guideline_title ILIKE '%NCCN%';

\echo ''
\echo '===================================================='
\echo 'AUDIT COMPLETE'
\echo '===================================================='

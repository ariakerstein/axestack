-- Check what content is already in the database
-- Run this in Supabase SQL Editor

-- Summary by guideline
SELECT
  guideline_source,
  guideline_title,
  cancer_type,
  COUNT(*) as chunk_count,
  MAX(created_at) as last_updated
FROM guideline_chunks
GROUP BY guideline_source, guideline_title, cancer_type
ORDER BY guideline_source, cancer_type;

-- Total counts
SELECT
  COUNT(*) as total_chunks,
  COUNT(DISTINCT guideline_title) as unique_guidelines,
  COUNT(DISTINCT cancer_type) as cancer_types
FROM guideline_chunks;

-- By cancer type
SELECT
  cancer_type,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT guideline_title) as guideline_count
FROM guideline_chunks
GROUP BY cancer_type
ORDER BY chunk_count DESC;

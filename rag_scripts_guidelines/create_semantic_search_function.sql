-- ============================================================
-- SEMANTIC SEARCH FUNCTION - Cosine Similarity with pgvector
-- ============================================================
-- Run this in Supabase SQL Editor to enable semantic search
-- Date: October 29, 2025

-- ============================================================
-- Create match_chunks Function
-- ============================================================
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 8,
  cancer_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  guideline_title text,
  guideline_source text,
  cancer_type text,
  chunk_text text,
  chunk_index int,
  content_tier text,
  content_type text,
  page_start int,
  page_end int,
  section_heading text,
  storage_path text,
  url text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.guideline_title,
    gc.guideline_source,
    gc.cancer_type,
    gc.chunk_text,
    gc.chunk_index,
    gc.content_tier,
    gc.content_type,
    gc.page_start,
    gc.page_end,
    gc.section_heading,
    gc.storage_path,
    gc.url,
    gc.created_at,
    1 - (gc.chunk_embedding_vec <=> query_embedding) AS similarity
  FROM guideline_chunks gc
  WHERE
    -- Semantic similarity threshold (cosine distance < 1 - threshold)
    (gc.chunk_embedding_vec <=> query_embedding) < (1 - match_threshold)
    -- Fuzzy cancer type filter (optional)
    AND (
      cancer_type_filter IS NULL
      OR gc.cancer_type ILIKE '%' || cancer_type_filter || '%'
    )
  ORDER BY gc.chunk_embedding_vec <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Test the Function
-- ============================================================
-- Generate a test embedding (you'll need actual embedding in production)
-- Example usage:
--
-- SELECT * FROM match_chunks(
--   query_embedding := (SELECT chunk_embedding_vec FROM guideline_chunks LIMIT 1),
--   match_threshold := 0.7,
--   match_count := 5,
--   cancer_type_filter := 'brain'
-- );

-- ============================================================
-- Verify Function Created
-- ============================================================
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'match_chunks'
  AND routine_schema = 'public';

-- Expected: Should show match_chunks function exists

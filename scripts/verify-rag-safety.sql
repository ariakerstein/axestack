-- ============================================
-- Safety Verification: RAG System & Suggested Questions
-- ============================================
-- This script verifies that Migration 5 won't break:
-- (1) RAG system pulling the right guideline sources
-- (2) Suggested questions mapping cleanly to cancer types

-- ============================================
-- PART 1: RAG SYSTEM (guideline_chunks)
-- ============================================
-- Verify guideline chunks have correct cancer_code mappings

SELECT
  'RAG System - Guideline Chunks' as verification_type,
  cancer_type,
  cancer_code,
  COUNT(*) as chunk_count
FROM guideline_chunks
WHERE cancer_type IS NOT NULL
GROUP BY cancer_type, cancer_code
ORDER BY cancer_type;

-- Check for unmapped guideline chunks (these would break RAG)
SELECT
  'CRITICAL: Unmapped Guideline Chunks' as alert,
  COUNT(*) as unmapped_count
FROM guideline_chunks
WHERE cancer_type IS NOT NULL
  AND cancer_code IS NULL;

-- ============================================
-- PART 2: SUGGESTED QUESTIONS (patient_questions2)
-- ============================================
-- Verify suggested questions have correct cancer_code mappings

SELECT
  'Suggested Questions Mappings' as verification_type,
  cancer_type,
  cancer_code,
  COUNT(*) as question_count
FROM patient_questions2
WHERE cancer_type IS NOT NULL
GROUP BY cancer_type, cancer_code
ORDER BY cancer_type;

-- Check for unmapped questions (these would break suggested questions)
SELECT
  'CRITICAL: Unmapped Suggested Questions' as alert,
  COUNT(*) as unmapped_count
FROM patient_questions2
WHERE cancer_type IS NOT NULL
  AND cancer_code IS NULL;

-- ============================================
-- PART 3: LYMPHOMA SPECIFICITY CHECK
-- ============================================
-- Check if we have follicular-specific questions

SELECT
  'Lymphoma Questions Breakdown' as verification_type,
  cancer_code,
  COUNT(*) as question_count,
  STRING_AGG(DISTINCT cancer_type, ', ') as cancer_types
FROM patient_questions2
WHERE cancer_type ILIKE '%lymphoma%'
GROUP BY cancer_code
ORDER BY cancer_code;

-- Show example follicular lymphoma questions (if any)
SELECT
  'Example Follicular Lymphoma Questions' as verification_type,
  id,
  cancer_type,
  cancer_code,
  LEFT(question, 100) as question_preview
FROM patient_questions2
WHERE cancer_code = 'nhl_follicular'
LIMIT 5;

-- Show example generic lymphoma questions
SELECT
  'Example Generic Lymphoma Questions' as verification_type,
  id,
  cancer_type,
  cancer_code,
  LEFT(question, 100) as question_preview
FROM patient_questions2
WHERE cancer_type ILIKE '%lymphoma%'
  AND cancer_code != 'nhl_follicular'
LIMIT 5;

-- ============================================
-- PART 4: CRITICAL CANCER TYPES CHECK
-- ============================================
-- Verify all critical cancer types from Circle App dropdown are mapped

WITH circle_app_types AS (
  SELECT UNNEST(ARRAY[
    'Breast', 'Lung', 'Colorectal', 'Prostate',
    'Pancreatic', 'Ovarian', 'Melanoma', 'Leukemia',
    'Lymphoma', 'Follicular Lymphoma', 'Glioma'
  ]) as dropdown_value
)
SELECT
  'Circle App Coverage Check' as verification_type,
  c.dropdown_value,
  COUNT(DISTINCT pq.cancer_code) as unique_codes_available,
  COUNT(pq.id) as total_questions_available
FROM circle_app_types c
LEFT JOIN patient_questions2 pq
  ON pq.cancer_type ILIKE '%' || c.dropdown_value || '%'
  OR pq.cancer_code IN (
    CASE c.dropdown_value
      WHEN 'Breast' THEN 'breast_cancer'
      WHEN 'Lung' THEN 'lung_nsclc'
      WHEN 'Colorectal' THEN 'colorectal_cancer'
      WHEN 'Prostate' THEN 'prostate_cancer'
      WHEN 'Pancreatic' THEN 'pancreatic_cancer'
      WHEN 'Ovarian' THEN 'ovarian_cancer'
      WHEN 'Melanoma' THEN 'melanoma'
      WHEN 'Leukemia' THEN 'aml'
      WHEN 'Lymphoma' THEN 'hodgkin_lymphoma'
      WHEN 'Follicular Lymphoma' THEN 'nhl_follicular'
      WHEN 'Glioma' THEN 'glioma'
    END
  )
GROUP BY c.dropdown_value
ORDER BY c.dropdown_value;

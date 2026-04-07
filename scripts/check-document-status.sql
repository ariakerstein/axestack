-- Check the status of recent PDF documents
-- Replace the file name pattern with your actual file name

SELECT
  id,
  original_name,
  file_type,
  status,
  processing_status,
  created_at,
  LENGTH(extracted_text) as text_length,
  LENGTH(ai_summary) as summary_length,
  CASE
    WHEN ai_summary LIKE '%Analysis failed%' THEN 'ERROR: ' || ai_summary
    ELSE 'OK'
  END as analysis_status
FROM medical_records
WHERE original_name LIKE '%Brian Kane%'
   OR original_name LIKE '%Timeline%'
ORDER BY created_at DESC
LIMIT 5;

-- Also check caregiver_documents if applicable
SELECT
  id,
  original_name,
  file_type,
  processing_status,
  created_at,
  LENGTH(extracted_text) as text_length,
  LENGTH(deidentified_text) as deidentified_length,
  LENGTH(ai_summary) as summary_length,
  CASE
    WHEN ai_summary LIKE '%Analysis failed%' THEN 'ERROR: ' || ai_summary
    ELSE 'OK'
  END as analysis_status
FROM caregiver_documents
WHERE original_name LIKE '%Brian Kane%'
   OR original_name LIKE '%Timeline%'
ORDER BY created_at DESC
LIMIT 5;

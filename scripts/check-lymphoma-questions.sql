-- Check all lymphoma questions
SELECT
  id,
  cancer_type,
  cancer_code,
  LEFT(question, 120) as question_preview
FROM patient_questions2
WHERE cancer_type ILIKE '%lymphoma%'
ORDER BY cancer_type, cancer_code;

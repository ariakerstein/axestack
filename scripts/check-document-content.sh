#!/bin/bash
# Check what's actually stored in the database for this document

DOCUMENT_ID="5633a46d-53fc-4dfa-b3be-e9cea0e312ec"

echo "Checking document content in database..."
echo ""

# This would need to be run in Supabase SQL Editor
cat << 'EOF'
Run this in Supabase SQL Editor:

SELECT
  id,
  original_name,
  file_size,
  processing_status,
  length(extracted_text) as extracted_text_length,
  substring(extracted_text, 1, 500) as extracted_text_preview,
  length(ai_summary) as ai_summary_length,
  substring(ai_summary, 1, 200) as ai_summary_preview
FROM caregiver_documents
WHERE id = '5633a46d-53fc-4dfa-b3be-e9cea0e312ec';
EOF

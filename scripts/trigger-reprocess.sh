#!/bin/bash
# Trigger reprocessing of the 60MB document to extract text

SUPABASE_URL="https://felofmlhqwcdpiyjgstx.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ"
DOCUMENT_ID="5633a46d-53fc-4dfa-b3be-e9cea0e312ec"

echo "🚀 Triggering reprocessing of large document..."
echo "Document ID: $DOCUMENT_ID"
echo ""
echo "⏳ This may take 30-90 seconds (extracting text from 60MB PDF)..."
echo ""

curl -X POST \
  "$SUPABASE_URL/functions/v1/process-document" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "'"$DOCUMENT_ID"'",
    "tableName": "caregiver_documents"
  }' \
  -v

echo ""
echo ""
echo "✅ Request sent! Check the response above."
echo ""
echo "If successful, you should see:"
echo "  - extracted_text_length: 50,000+ characters"
echo "  - skipped_analysis: true"
echo "  - message: Text extraction completed"

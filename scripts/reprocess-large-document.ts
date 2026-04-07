/**
 * Script to manually trigger reprocessing of a large document
 * This will extract text from the 60MB PDF using the new logic
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DOCUMENT_ID = '5633a46d-53fc-4dfa-b3be-e9cea0e312ec';

async function reprocessLargeDocument() {
  console.log('🚀 Triggering reprocessing of large document...');
  console.log(`Document ID: ${DOCUMENT_ID}`);

  // Call the process-document Edge Function directly
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/process-document`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type: 'INSERT',
        table: 'caregiver_documents',
        record: {
          id: DOCUMENT_ID
        },
        old_record: null
      })
    }
  );

  console.log(`Response status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Success!');
    console.log(JSON.stringify(data, null, 2));

    if (data.extracted_text_length) {
      console.log(`\n📄 Extracted ${data.extracted_text_length.toLocaleString()} characters from PDF`);
    }

    if (data.skipped_analysis) {
      console.log('⚠️ AI analysis was skipped due to file size (this is expected)');
    }
  } else {
    const error = await response.text();
    console.error('❌ Error:', error);
  }
}

reprocessLargeDocument().catch(console.error);

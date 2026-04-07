// Force reprocess by resetting status first
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function forceReprocess() {
  const docId = '92b873e6-cfae-4e3a-a56f-9a1c1b3f86ae'; // The 58.6MB PDF

  console.log('1️⃣  Resetting document status to pending...\n');

  // Reset status to pending and clear extracted_text
  const { error: resetError } = await supabase
    .from('caregiver_documents')
    .update({
      processing_status: 'pending',
      extracted_text: null,
      ai_summary: null
    })
    .eq('id', docId);

  if (resetError) {
    console.error('Error resetting:', resetError);
    return;
  }

  console.log('✅ Status reset to pending\n');
  console.log('2️⃣  Triggering process-document...\n');

  const startTime = Date.now();

  const { data, error } = await supabase.functions.invoke('process-document', {
    body: {
      recordId: docId,
      tableName: 'caregiver_documents'
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data?.error) {
    console.error('❌ Function error:', data.error);
    console.error('Details:', data);
    return;
  }

  console.log(`✅ Processing completed in ${duration}s\n`);

  // Wait a moment for DB to update
  await new Promise(r => setTimeout(r, 2000));

  // Check the result
  const { data: updated } = await supabase
    .from('caregiver_documents')
    .select('extracted_text, ai_summary, processing_status')
    .eq('id', docId)
    .single();

  if (updated) {
    const textLength = updated.extracted_text?.length || 0;

    console.log('3️⃣  Results:\n');
    console.log(`Status: ${updated.processing_status}`);
    console.log(`Extracted text: ${textLength} chars`);
    console.log(`Has summary: ${!!updated.ai_summary}\n`);

    if (textLength > 10000) {
      console.log('🎉 SUCCESS! Extracted significant content from the 58MB PDF!');
      console.log(`\nFirst 500 chars:\n${updated.extracted_text.substring(0, 500)}...\n`);
    } else if (textLength > 1000) {
      console.log('✅ Good progress, but may need more passes for full extraction');
    } else {
      console.log('⚠️  Still only placeholder text - PDF may be image-based');
      console.log(`\nExtracted text:\n${updated.extracted_text}\n`);
    }
  }
}

forceReprocess();

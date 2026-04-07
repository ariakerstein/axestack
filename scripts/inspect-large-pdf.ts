// Inspect what's actually in the large PDF
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectPDF() {
  const docId = '92b873e6-cfae-4e3a-a56f-9a1c1b3f86ae'; // The 58.6MB PDF

  const { data: doc } = await supabase
    .from('caregiver_documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (!doc) {
    console.log('Document not found');
    return;
  }

  console.log('📄 Document Details:\n');
  console.log(`Name: ${doc.original_name}`);
  console.log(`Size: ${(doc.file_size / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Type: ${doc.file_type}`);
  console.log(`Status: ${doc.processing_status}`);
  console.log(`Created: ${doc.created_at}\n`);

  console.log(`📝 Extracted Text (${doc.extracted_text?.length || 0} chars):`);
  console.log('─'.repeat(60));
  console.log(doc.extracted_text || 'None');
  console.log('─'.repeat(60));

  console.log(`\n📋 AI Summary (${doc.ai_summary?.length || 0} chars):`);
  console.log('─'.repeat(60));
  console.log(doc.ai_summary || 'None');
  console.log('─'.repeat(60));

  // Check if it's an image-heavy PDF
  if (doc.extracted_text && doc.extracted_text.length < 1000 && doc.file_size > 50 * 1024 * 1024) {
    console.log('\n⚠️  ANALYSIS:');
    console.log('This 58MB PDF only extracted 878 characters.');
    console.log('This suggests:');
    console.log('  1. PDF is primarily images/scans (no searchable text layer)');
    console.log('  2. PDF has heavy formatting that Claude struggles with');
    console.log('  3. Content is in a format Claude cannot extract');
    console.log('\n💡 RECOMMENDATION:');
    console.log('  - If it\'s a scanned document, it needs OCR processing');
    console.log('  - Claude\'s document API may not support OCR for large files');
    console.log('  - Consider using a dedicated OCR service (Textract, Azure, etc.)');
  }
}

inspectPDF();

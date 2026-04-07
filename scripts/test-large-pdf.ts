// Test large PDF processing with the 60MB file
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testLargePDF() {
  console.log('🔍 Finding the 60MB PDF with only 878 chars...\n');

  // Find the document
  const { data: docs } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, file_size, extracted_text, ai_summary')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!docs || docs.length === 0) {
    console.log('No documents found');
    return;
  }

  // Find the one with large file size but small extracted text
  const largePDF = docs.find(d =>
    d.file_size && d.file_size > 50 * 1024 * 1024 && // > 50MB
    d.extracted_text && d.extracted_text.length < 2000 // < 2000 chars
  );

  if (!largePDF) {
    console.log('Could not find the 60MB PDF with truncation issue');
    console.log('\nRecent documents:');
    docs.forEach(d => {
      const sizeMB = d.file_size ? (d.file_size / 1024 / 1024).toFixed(1) : 'unknown';
      const textChars = d.extracted_text?.length || 0;
      console.log(`- ${d.original_name}: ${sizeMB}MB, ${textChars} chars extracted`);
    });
    return;
  }

  const sizeMB = (largePDF.file_size / 1024 / 1024).toFixed(1);
  console.log(`Found: ${largePDF.original_name}`);
  console.log(`  Size: ${sizeMB}MB`);
  console.log(`  Current extracted text: ${largePDF.extracted_text.length} chars`);
  console.log(`  ID: ${largePDF.id}\n`);

  console.log('🔄 Reprocessing with new multi-pass extraction...\n');

  const startTime = Date.now();

  const { data, error } = await supabase.functions.invoke('process-document', {
    body: {
      recordId: largePDF.id,
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
    return;
  }

  console.log(`\n✅ Processing completed in ${duration}s\n`);

  // Check the result
  const { data: updated } = await supabase
    .from('caregiver_documents')
    .select('extracted_text, ai_summary, processing_status')
    .eq('id', largePDF.id)
    .single();

  if (updated) {
    const newTextLength = updated.extracted_text?.length || 0;
    const improvement = newTextLength - largePDF.extracted_text.length;
    const improvementPercent = ((improvement / largePDF.extracted_text.length) * 100).toFixed(0);

    console.log('📊 Results:');
    console.log(`  Status: ${updated.processing_status}`);
    console.log(`  Extracted text: ${newTextLength} chars (was ${largePDF.extracted_text.length})`);
    console.log(`  Improvement: +${improvement} chars (+${improvementPercent}%)`);
    console.log(`  Has summary: ${!!updated.ai_summary}`);

    if (newTextLength > largePDF.extracted_text.length * 2) {
      console.log('\n🎉 SUCCESS! Multi-pass extraction extracted significantly more content!');
    } else if (newTextLength > largePDF.extracted_text.length) {
      console.log('\n✅ Good! Extracted more content, but may need more passes.');
    } else {
      console.log('\n⚠️  No improvement - may need to investigate further.');
    }
  }
}

testLargePDF();

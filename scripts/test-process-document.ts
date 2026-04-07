// Test the process-document function directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProcessDocument() {
  // Get a recent document that needs processing
  const { data: records, error: fetchError } = await supabase
    .from('medical_records')
    .select('id, original_name, status, file_type, extracted_text, ai_summary')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fetchError) {
    console.error('Error fetching records:', fetchError);
    return;
  }

  if (!records || records.length === 0) {
    console.log('No records found');
    return;
  }

  console.log(`\nFound ${records.length} recent records:\n`);
  records.forEach((r, i) => {
    console.log(`${i + 1}. ${r.original_name}`);
    console.log(`   Type: ${r.file_type}, Status: ${r.status}`);
    console.log(`   Text: ${!!r.extracted_text}, Summary: ${!!r.ai_summary}`);
    if (r.ai_summary?.includes('failed')) {
      console.log(`   ⚠️  Error: ${r.ai_summary.substring(0, 80)}...`);
    }
    console.log('');
  });

  const record = records[0];
  console.log('\n📄 Testing with first record:');
  console.log(`  ID: ${record.id}`);
  console.log(`  Name: ${record.original_name}`);
  console.log(`  Type: ${record.file_type}`);
  console.log(`  Status: ${record.status}`);
  console.log(`  Has extracted_text: ${!!record.extracted_text}`);
  console.log(`  Has ai_summary: ${!!record.ai_summary}`);

  if (record.ai_summary?.includes('Analysis failed')) {
    console.log(`  Error: ${record.ai_summary.substring(0, 100)}...`);
  }

  console.log('\n🔧 Calling process-document function...');

  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: {
        recordId: record.id,
        tableName: 'medical_records'
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Completed in ${duration}s`);

    if (error) {
      console.error('\n❌ Edge Function Error:');
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (data?.error) {
      console.error('\n❌ Function Response Error:');
      console.error(`  Error: ${data.error}`);
      console.error(`  Code: ${data.errorCode}`);
      if (data.details) {
        console.error(`  Details:`, data.details);
      }
      return;
    }

    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(data, null, 2));

    // Check the updated record
    console.log('\n🔍 Checking updated record...');
    const { data: updated, error: checkError } = await supabase
      .from('medical_records')
      .select('status, extracted_text, ai_summary')
      .eq('id', record.id)
      .single();

    if (checkError) {
      console.error('Error checking record:', checkError);
    } else {
      console.log(`  Status: ${updated.status}`);
      console.log(`  Has extracted_text: ${!!updated.extracted_text} (${updated.extracted_text?.length || 0} chars)`);
      console.log(`  Has ai_summary: ${!!updated.ai_summary}`);
      if (updated.ai_summary?.includes('Analysis failed')) {
        console.log(`  ⚠️  Still has error: ${updated.ai_summary.substring(0, 150)}...`);
      }
    }

  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Exception after ${duration}s:`, err);
  }
}

testProcessDocument();

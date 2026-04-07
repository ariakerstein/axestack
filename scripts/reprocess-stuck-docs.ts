// Reprocess all stuck documents
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reprocessDocument(recordId: string, tableName: string, originalName: string) {
  console.log(`\n🔄 Reprocessing: ${originalName}`);
  console.log(`   ID: ${recordId}, Table: ${tableName}`);

  try {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: {
        recordId,
        tableName
      }
    });

    if (error) {
      console.error(`   ❌ Error:`, error.message);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error(`   ❌ Function error:`, data.error);
      return { success: false, error: data.error };
    }

    console.log(`   ✅ Success!`);
    return { success: true };
  } catch (err: any) {
    console.error(`   ❌ Exception:`, err.message);
    return { success: false, error: err.message };
  }
}

async function reprocessAllStuck() {
  console.log('🚀 Starting bulk reprocessing of stuck documents...\n');

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Get stuck medical_records
  const { data: stuckMR } = await supabase
    .from('medical_records')
    .select('id, original_name, status')
    .in('status', ['pending', 'processing', 'error'])
    .order('created_at', { ascending: false })
    .limit(10); // Process 10 at a time to avoid overwhelming the API

  if (stuckMR && stuckMR.length > 0) {
    console.log(`Found ${stuckMR.length} stuck medical_records (processing first 10)...\n`);

    for (const record of stuckMR) {
      results.total++;
      const result = await reprocessDocument(record.id, 'medical_records', record.original_name);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`${record.original_name}: ${result.error}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Get stuck caregiver_documents
  const { data: stuckCG } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, processing_status')
    .in('processing_status', ['pending', 'processing', 'failed'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (stuckCG && stuckCG.length > 0) {
    console.log(`\nFound ${stuckCG.length} stuck caregiver_documents...\n`);

    for (const record of stuckCG) {
      results.total++;
      const result = await reprocessDocument(record.id, 'caregiver_documents', record.original_name);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`${record.original_name}: ${result.error}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${results.total}`);
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }
}

reprocessAllStuck();

// Find documents stuck in processing or with errors
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findStuckDocs() {
  console.log('🔍 Finding stuck or failed documents...\n');

  // Find stuck medical_records
  const { data: stuckMR, error: mrError } = await supabase
    .from('medical_records')
    .select('id, original_name, status, created_at, ai_summary')
    .in('status', ['pending', 'processing', 'error'])
    .order('created_at', { ascending: false});

  if (mrError) {
    console.error('Error:', mrError);
  } else if (stuckMR && stuckMR.length > 0) {
    console.log(`⚠️  Found ${stuckMR.length} stuck medical_records:\n`);
    stuckMR.forEach(r => {
      console.log(`- ${r.original_name}`);
      console.log(`  ID: ${r.id}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Created: ${new Date(r.created_at).toLocaleString()}`);
      if (r.ai_summary) {
        console.log(`  Summary: ${r.ai_summary.substring(0, 100)}...`);
      }
      console.log('');
    });
  } else {
    console.log('✅ No stuck medical_records\n');
  }

  // Find stuck caregiver_documents
  const { data: stuckCG, error: cgError } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, processing_status, created_at, ai_summary')
    .in('processing_status', ['pending', 'processing', 'failed'])
    .order('created_at', { ascending: false});

  if (cgError) {
    console.error('Error:', cgError);
  } else if (stuckCG && stuckCG.length > 0) {
    console.log(`⚠️  Found ${stuckCG.length} stuck caregiver_documents:\n`);
    stuckCG.forEach(r => {
      console.log(`- ${r.original_name}`);
      console.log(`  ID: ${r.id}`);
      console.log(`  Status: ${r.processing_status}`);
      console.log(`  Created: ${new Date(r.created_at).toLocaleString()}`);
      if (r.ai_summary) {
        console.log(`  Summary: ${r.ai_summary.substring(0, 100)}...`);
      }
      console.log('');
    });
  } else {
    console.log('✅ No stuck caregiver_documents\n');
  }

  // Find documents with failed summaries
  const { data: failedMR } = await supabase
    .from('medical_records')
    .select('id, original_name, status, ai_summary')
    .ilike('ai_summary', '%failed%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (failedMR && failedMR.length > 0) {
    console.log(`\n❌ Found ${failedMR.length} medical_records with "failed" in summary:\n`);
    failedMR.forEach(r => {
      console.log(`- ${r.original_name}`);
      console.log(`  ID: ${r.id}`);
      console.log(`  Error: ${r.ai_summary?.substring(0, 150)}...`);
      console.log('');
    });
  }

  const { data: failedCG } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, processing_status, ai_summary')
    .ilike('ai_summary', '%failed%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (failedCG && failedCG.length > 0) {
    console.log(`\n❌ Found ${failedCG.length} caregiver_documents with "failed" in summary:\n`);
    failedCG.forEach(r => {
      console.log(`- ${r.original_name}`);
      console.log(`  ID: ${r.id}`);
      console.log(`  Error: ${r.ai_summary?.substring(0, 150)}...`);
      console.log('');
    });
  }
}

findStuckDocs();

// Check recent uploads in both tables using service role key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://felofmlhqwcdpiyjgstx.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUploads() {
  console.log('Checking recent uploads...\n');

  // Check medical_records
  const { data: medRecords, error: mrError } = await supabase
    .from('medical_records')
    .select('id, original_name, file_type, status, created_at, extracted_text, ai_summary, user_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (mrError) {
    console.error('Error fetching medical_records:', mrError);
  } else if (medRecords && medRecords.length > 0) {
    console.log(`📋 medical_records (${medRecords.length} recent):\n`);
    medRecords.forEach((r, i) => {
      console.log(`${i + 1}. ${r.original_name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Type: ${r.file_type}, Status: ${r.status}`);
      console.log(`   User: ${r.user_id?.substring(0, 8)}...`);
      console.log(`   Created: ${new Date(r.created_at).toLocaleString()}`);
      console.log(`   Text: ${r.extracted_text ? `${r.extracted_text.length} chars` : 'NO'}`);
      console.log(`   Summary: ${r.ai_summary ? (r.ai_summary.includes('failed') ? '❌ ERROR' : '✅ YES') : 'NO'}`);
      if (r.ai_summary?.toLowerCase().includes('failed')) {
        console.log(`   Error: ${r.ai_summary.substring(0, 100)}...`);
      }
      console.log('');
    });
  } else {
    console.log('No medical_records found\n');
  }

  // Check caregiver_documents
  const { data: cgDocs, error: cgError } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, file_type, processing_status, created_at, extracted_text, ai_summary, caregiver_id')
    .order('created_at', { ascending: false})
    .limit(5);

  if (cgError) {
    console.error('Error fetching caregiver_documents:', cgError);
  } else if (cgDocs && cgDocs.length > 0) {
    console.log(`\n👥 caregiver_documents (${cgDocs.length} recent):\n`);
    cgDocs.forEach((r, i) => {
      console.log(`${i + 1}. ${r.original_name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Type: ${r.file_type}, Status: ${r.processing_status}`);
      console.log(`   Caregiver: ${r.caregiver_id?.substring(0, 8)}...`);
      console.log(`   Created: ${new Date(r.created_at).toLocaleString()}`);
      console.log(`   Text: ${r.extracted_text ? `${r.extracted_text.length} chars` : 'NO'}`);
      console.log(`   Summary: ${r.ai_summary ? (r.ai_summary.includes('failed') ? '❌ ERROR' : '✅ YES') : 'NO'}`);
      if (r.ai_summary?.toLowerCase().includes('failed')) {
        console.log(`   Error: ${r.ai_summary.substring(0, 100)}...`);
      }
      console.log('');
    });
  } else {
    console.log('\nNo caregiver_documents found');
  }
}

checkUploads();

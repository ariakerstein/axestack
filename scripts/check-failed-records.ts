import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://felofmlhqwcdpiyjgstx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFailedRecords() {
  console.log('Checking for records with old model error...\n');

  // Check medical_records
  const { data: medicalRecords, error: mrError } = await supabase
    .from('medical_records')
    .select('id, original_name, ai_summary, status, created_at')
    .ilike('ai_summary', '%claude-3-5-sonnet-20241022%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (mrError) {
    console.error('Error fetching medical records:', mrError);
  } else if (medicalRecords && medicalRecords.length > 0) {
    console.log(`Found ${medicalRecords.length} medical_records with old model error:\n`);
    medicalRecords.forEach(record => {
      console.log(`- ID: ${record.id}`);
      console.log(`  Name: ${record.original_name}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Error: ${record.ai_summary?.substring(0, 150)}...\n`);
    });
  } else {
    console.log('No medical_records found with old model error.');
  }

  // Check caregiver_documents
  const { data: caregiverDocs, error: cdError } = await supabase
    .from('caregiver_documents')
    .select('id, original_name, ai_summary, processing_status, created_at')
    .ilike('ai_summary', '%claude-3-5-sonnet-20241022%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (cdError) {
    console.error('Error fetching caregiver documents:', cdError);
  } else if (caregiverDocs && caregiverDocs.length > 0) {
    console.log(`\nFound ${caregiverDocs.length} caregiver_documents with old model error:\n`);
    caregiverDocs.forEach(record => {
      console.log(`- ID: ${record.id}`);
      console.log(`  Name: ${record.original_name}`);
      console.log(`  Status: ${record.processing_status}`);
      console.log(`  Error: ${record.ai_summary?.substring(0, 150)}...\n`);
    });
  } else {
    console.log('\nNo caregiver_documents found with old model error.');
  }
}

checkFailedRecords();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('   Using anon key might not show all records due to RLS');
  process.exit(1);
}

console.log('Using service role key (bypasses RLS)...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findPatients() {
  console.log('🔍 Finding patients with medical records (ADMIN VIEW)...\n');

  // Get all medical records grouped by user_id - using service role bypasses RLS
  const { data: records, error } = await supabase
    .from('medical_records')
    .select('user_id, original_name, ai_summary, status, record_type, created_at')
    .neq('record_type', 'patient_summary')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    return;
  }

  if (!records || records.length === 0) {
    console.log('⚠️  No medical records found in database!');
    console.log('   This might mean:');
    console.log('   - Wrong database/project');
    console.log('   - Records are in a different table');
    console.log('   - No data has been uploaded yet');
    return;
  }

  // Group by user_id
  const patientRecords = {};
  records.forEach(r => {
    if (!patientRecords[r.user_id]) {
      patientRecords[r.user_id] = [];
    }
    patientRecords[r.user_id].push(r);
  });

  console.log(`✅ Found ${records.length} total medical records`);
  console.log(`   Belonging to ${Object.keys(patientRecords).length} different patients\n`);

  let count = 0;
  for (const [userId, userRecords] of Object.entries(patientRecords)) {
    count++;
    const analyzedCount = userRecords.filter(r => r.ai_summary).length;

    console.log(`${count}. Patient ID: ${userId}`);
    console.log(`   Records: ${userRecords.length} total, ${analyzedCount} analyzed`);
    console.log(`   Latest: ${userRecords[0].original_name} (${new Date(userRecords[0].created_at).toLocaleDateString()})`);

    // Check if provisional
    const { data: provData } = await supabase
      .from('provisional_patients')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (provData) {
      console.log(`   Type: Provisional patient (${provData.first_name} ${provData.last_name}, ${provData.email})`);
    } else {
      // Try to get auth user info
      console.log(`   Type: Auth user (ID: ${userId})`);
    }

    console.log('');

    if (count >= 5) {
      console.log('(Showing first 5 patients only)\n');
      break;
    }
  }

  if (count > 0) {
    const firstPatientId = Object.keys(patientRecords)[0];
    console.log('💡 To test summary generation, run in browser console:');
    console.log(`   Or visit: /patient/${firstPatientId}`);
  }
}

findPatients();

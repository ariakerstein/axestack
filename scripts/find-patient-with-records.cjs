require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPatients() {
  console.log('🔍 Finding patients with medical records...\n');

  // Get all medical records grouped by user_id
  const { data: records, error } = await supabase
    .from('medical_records')
    .select('user_id, original_name, ai_summary, status, record_type')
    .neq('record_type', 'patient_summary')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error.message);
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

  console.log(`Found ${Object.keys(patientRecords).length} patients with records:\n`);

  let count = 0;
  for (const [userId, userRecords] of Object.entries(patientRecords)) {
    count++;
    const analyzedCount = userRecords.filter(r => r.ai_summary).length;

    console.log(`${count}. Patient ID: ${userId}`);
    console.log(`   Records: ${userRecords.length} total, ${analyzedCount} analyzed`);
    console.log(`   Sample: ${userRecords[0].original_name}`);

    // Check if provisional
    const { data: provData } = await supabase
      .from('provisional_patients')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (provData) {
      console.log(`   Type: Provisional patient (${provData.first_name} ${provData.last_name})`);
    } else {
      console.log(`   Type: Auth user`);
    }

    console.log('');

    if (count >= 5) {
      console.log('(Showing first 5 patients only)');
      break;
    }
  }

  if (count > 0) {
    const firstPatientId = Object.keys(patientRecords)[0];
    console.log('\n💡 To test summary generation, use:');
    console.log(`   node scripts/test-summary-generation.cjs ${firstPatientId}`);
  }
}

findPatients();
